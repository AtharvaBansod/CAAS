/**
 * Tests for FDB-CONN-004: Control Plane Service
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getControlPlaneService, resetControlPlaneForTest } from '../src/control-plane';
import { resetTenantConfigForTest } from '../src/tenant-config';
import { resetCredentialManagerForTest, getCredentialManager } from '../src/credentials';
import { resetRoutingEngineForTest } from '../src/routing';

const ADMIN_ACTOR = { actorId: 'admin-1', tenantId: 't1', role: 'platform_admin' as const };
const TENANT_ACTOR = { actorId: 'user-1', tenantId: 't1', role: 'tenant_admin' as const };
const VIEWER = { actorId: 'v-1', tenantId: 't1', role: 'viewer' as const };

const VALID_PROFILE = {
  tenantId: 't1',
  provider: 'mongodb' as const,
  region: 'us-east-1',
  endpoint: 'https://mongo.example.com',
  authMode: 'connection_string' as const,
  encryptionMode: 'provider_managed' as const,
  allowedDomains: ['users' as const],
};

describe('Control Plane Service', () => {
  beforeEach(() => {
    resetControlPlaneForTest();
    resetTenantConfigForTest();
    resetCredentialManagerForTest();
    resetRoutingEngineForTest();
  });

  it('should create a profile as platform_admin', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    expect(profile.tenantId).toBe('t1');
    expect(profile.provider).toBe('mongodb');
  });

  it('should create a profile as tenant_admin (own tenant)', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, TENANT_ACTOR);
    expect(profile.tenantId).toBe('t1');
  });

  it('should deny cross-tenant create for tenant_admin', () => {
    const cp = getControlPlaneService();
    const otherTenantInput = { ...VALID_PROFILE, tenantId: 't2' };
    expect(() => cp.createProfile(otherTenantInput, TENANT_ACTOR)).toThrow('Cannot create profile');
  });

  it('should get profile by id', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const found = cp.getProfile(profile.id, ADMIN_ACTOR);
    expect(found).toBeDefined();
    expect(found!.tenantId).toBe('t1');
  });

  it('should list profiles by tenant', () => {
    const cp = getControlPlaneService();
    cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const profiles = cp.listProfiles(ADMIN_ACTOR);
    expect(profiles.length).toBe(1);
  });

  it('should run preflight', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    // Store a credential so preflight passes auth check
    const cm = getCredentialManager();
    cm.store(profile.id, 't1', 'mongodb', 'connection_string', 'mongodb://localhost');
    const result = cp.runPreflight(profile.id, ADMIN_ACTOR);
    expect(result.connectivity).toBe(true);
    expect(result.authentication).toBe(true);
    expect(result.schemaReady).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('should block activation without preflight', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    expect(() => cp.activateProfile(profile.id, ADMIN_ACTOR)).toThrow();
  });

  it('should activate after preflight', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const cm = getCredentialManager();
    cm.store(profile.id, 't1', 'mongodb', 'connection_string', 'mongodb://localhost');
    cp.runPreflight(profile.id, ADMIN_ACTOR);
    const activated = cp.activateProfile(profile.id, ADMIN_ACTOR);
    expect(activated.status).toBe('active');
  });

  it('should deactivate a profile', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const cm = getCredentialManager();
    cm.store(profile.id, 't1', 'mongodb', 'connection_string', 'mongodb://localhost');
    cp.runPreflight(profile.id, ADMIN_ACTOR);
    cp.activateProfile(profile.id, ADMIN_ACTOR);
    const deactivated = cp.deactivateProfile(profile.id, ADMIN_ACTOR);
    expect(deactivated.status).toBe('inactive');
  });

  it('should delete a profile as platform_admin', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    cp.deleteProfile(profile.id, ADMIN_ACTOR);
    expect(cp.getProfile(profile.id, ADMIN_ACTOR)).toBeUndefined();
  });

  it('should deny viewer from creating', () => {
    const cp = getControlPlaneService();
    expect(() => cp.createProfile(VALID_PROFILE, VIEWER)).toThrow('Forbidden');
  });

  it('should record audit events', () => {
    const cp = getControlPlaneService();
    cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const events = cp.getAuditEvents('t1');
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('should test connection', () => {
    const cp = getControlPlaneService();
    const profile = cp.createProfile(VALID_PROFILE, ADMIN_ACTOR);
    const result = cp.testConnection(profile.id, ADMIN_ACTOR);
    expect(result.ok).toBe(true);
  });
});
