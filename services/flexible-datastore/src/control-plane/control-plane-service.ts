/**
 * FDB-CONN-004 — Datastore Control-Plane APIs, RBAC, and Preflight Validation
 *
 * - Gateway/admin control-plane API contract for profile CRUD + activate/deactivate.
 * - RBAC requiring tenant-admin authorization.
 * - Preflight validation workflow (connectivity, auth, schema, latency).
 * - Audit event model for every control-plane change.
 */

import { v4 as uuid } from 'uuid';
import {
  DatastoreProfile,
  PreflightResult,
  DatastoreAuditEvent,
  ProfileStatus,
} from '../types';
import { getTenantConfigStore, DatastoreProfileCreateInput } from '../tenant-config';
import { getCredentialManager } from '../credentials';
import { getRoutingEngine } from '../routing';
import { PreflightFailedError } from '../errors';

/* ─── RBAC ─── */

export type ControlPlaneRole = 'tenant_admin' | 'platform_admin' | 'viewer';

export interface ActorContext {
  actorId: string;
  tenantId: string;
  role: ControlPlaneRole;
}

function assertAuthorized(actor: ActorContext, requiredRole: ControlPlaneRole): void {
  const roleHierarchy: Record<ControlPlaneRole, number> = {
    viewer: 0,
    tenant_admin: 1,
    platform_admin: 2,
  };
  if (roleHierarchy[actor.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Forbidden: role ${actor.role} insufficient, requires ${requiredRole}`);
  }
}

/* ─── Control Plane Service ─── */

export class ControlPlaneService {
  private auditEvents: DatastoreAuditEvent[] = [];

  /* ── Profile CRUD ── */

  createProfile(input: DatastoreProfileCreateInput, actor: ActorContext): DatastoreProfile {
    assertAuthorized(actor, 'tenant_admin');
    if (actor.tenantId !== input.tenantId && actor.role !== 'platform_admin') {
      throw new Error('Cannot create profile for another tenant');
    }

    const store = getTenantConfigStore();
    const profile = store.create(input, actor.actorId);
    this.emitAudit(actor, 'profile.create', profile.id, { provider: profile.provider });
    return profile;
  }

  getProfile(profileId: string, actor: ActorContext): DatastoreProfile | undefined {
    assertAuthorized(actor, 'viewer');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (profile && profile.tenantId !== actor.tenantId && actor.role !== 'platform_admin') {
      throw new Error('Access denied');
    }
    return profile;
  }

  listProfiles(actor: ActorContext): DatastoreProfile[] {
    assertAuthorized(actor, 'viewer');
    const store = getTenantConfigStore();
    if (actor.role === 'platform_admin') return store.listAll();
    return store.getByTenant(actor.tenantId);
  }

  deactivateProfile(profileId: string, actor: ActorContext): DatastoreProfile {
    assertAuthorized(actor, 'tenant_admin');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);
    if (profile.tenantId !== actor.tenantId && actor.role !== 'platform_admin') {
      throw new Error('Access denied');
    }

    const updated = store.setStatus(profileId, 'inactive');
    this.emitAudit(actor, 'profile.deactivate', profileId, {});
    return updated;
  }

  deleteProfile(profileId: string, actor: ActorContext): void {
    assertAuthorized(actor, 'tenant_admin');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);
    if (profile.tenantId !== actor.tenantId && actor.role !== 'platform_admin') {
      throw new Error('Access denied');
    }
    if (profile.status === 'active') {
      throw new Error('Cannot delete active profile — deactivate first');
    }

    store.delete(profileId);
    this.emitAudit(actor, 'profile.delete', profileId, {});
  }

  /* ── Preflight Validation ── */

  runPreflight(profileId: string, actor: ActorContext): PreflightResult {
    assertAuthorized(actor, 'tenant_admin');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);

    store.setStatus(profileId, 'validating');

    const errors: string[] = [];
    const start = Date.now();

    // 1. Connectivity: profile endpoint reachable (simulated)
    const connectivity = profile.endpoint.startsWith('http');
    if (!connectivity) errors.push('Endpoint is not a valid URL');

    // 2. Authentication: credential exists
    const credMgr = getCredentialManager();
    const cred = credMgr.getByProfile(profileId);
    const authentication = !!cred;
    if (!authentication) errors.push('No credentials stored for this profile');

    // 3. Schema readiness (simulated as pass for known providers)
    const schemaReady = ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'].includes(
      profile.provider,
    );
    if (!schemaReady) errors.push(`Unknown provider: ${profile.provider}`);

    const latencyMs = Date.now() - start;
    const passed = connectivity && authentication && schemaReady;

    const result: PreflightResult = {
      connectivity,
      authentication,
      schemaReady,
      latencyMs,
      passed,
      checkedAt: new Date().toISOString(),
      errors,
    };

    store.setPreflightResult(profileId, result);

    if (!passed) {
      store.setStatus(profileId, 'failed');
    }

    this.emitAudit(actor, 'preflight.run', profileId, { passed, errors });
    return result;
  }

  /* ── Activate ── */

  activateProfile(profileId: string, actor: ActorContext): DatastoreProfile {
    assertAuthorized(actor, 'tenant_admin');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);
    if (profile.tenantId !== actor.tenantId && actor.role !== 'platform_admin') {
      throw new Error('Access denied');
    }

    // Preflight must have passed
    if (!profile.preflightResult || !profile.preflightResult.passed) {
      throw new PreflightFailedError(profileId, ['Preflight validation has not passed']);
    }

    // Deactivate any existing active profile for same tenant+project
    const existing = store.getActive(profile.tenantId, profile.projectId);
    if (existing && existing.id !== profileId) {
      store.setStatus(existing.id, 'inactive');
      this.emitAudit(actor, 'profile.auto_deactivate', existing.id, {
        reason: `Replaced by ${profileId}`,
      });
    }

    const activated = store.setStatus(profileId, 'active');

    // Register in routing engine
    const routing = getRoutingEngine();
    routing.setProfile(activated);

    this.emitAudit(actor, 'profile.activate', profileId, { provider: activated.provider });
    return activated;
  }

  /* ── Test Connection ── */

  testConnection(profileId: string, actor: ActorContext): { ok: boolean; latencyMs: number } {
    assertAuthorized(actor, 'viewer');
    const store = getTenantConfigStore();
    const profile = store.getById(profileId);
    if (!profile) throw new Error(`Profile ${profileId} not found`);

    // Simulated connection test
    const start = Date.now();
    const ok = profile.endpoint.startsWith('http');
    const latencyMs = Date.now() - start;

    this.emitAudit(actor, 'connection.test', profileId, { ok, latencyMs });
    return { ok, latencyMs };
  }

  /* ── Audit ── */

  getAuditEvents(tenantId?: string, limit = 100): DatastoreAuditEvent[] {
    const events = tenantId
      ? this.auditEvents.filter((e) => e.tenantId === tenantId)
      : this.auditEvents;
    return events.slice(-limit);
  }

  private emitAudit(
    actor: ActorContext,
    action: string,
    resource: string,
    details: Record<string, unknown>,
  ): void {
    this.auditEvents.push({
      id: uuid(),
      timestamp: new Date().toISOString(),
      tenantId: actor.tenantId,
      actor: actor.actorId,
      action,
      resource,
      details,
      correlationId: uuid(),
      outcome: 'success',
    });
  }
}

/* ─── Singleton ─── */

let _cp: ControlPlaneService | undefined;

export function getControlPlaneService(): ControlPlaneService {
  if (!_cp) _cp = new ControlPlaneService();
  return _cp;
}

export function resetControlPlaneForTest(): void {
  _cp = undefined;
}
