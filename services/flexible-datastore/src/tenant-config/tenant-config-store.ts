/**
 * FDB-CONN-001 — Tenant Datastore Configuration Model
 *
 * Tenant-level datastore profile schema with validation.
 * Supports tenant-wide and project-specific provider mapping.
 */

import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import {
  ProviderId,
  EntityDomain,
  ProfileStatus,
  AuthMode,
  EncryptionMode,
  DatastoreProfile,
  PreflightResult,
  ALL_PROVIDERS,
} from '../types';

/* ─── Zod Schemas ─── */

export const DatastoreProfileCreateSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().optional(),
  provider: z.enum(['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const),
  region: z.string().min(1),
  endpoint: z.string().url(),
  authMode: z.enum([
    'connection_string',
    'iam_role',
    'service_account',
    'access_key',
  ] as const),
  encryptionMode: z.enum([
    'provider_managed',
    'customer_managed_key',
    'platform_envelope',
  ] as const),
  allowedDomains: z
    .array(
      z.enum([
        'users',
        'conversations',
        'messages',
        'settings',
        'audit',
        'sessions',
        'presence',
      ] as const),
    )
    .min(1),
});

export type DatastoreProfileCreateInput = z.infer<typeof DatastoreProfileCreateSchema>;

export const DatastoreProfileUpdateSchema = DatastoreProfileCreateSchema.partial().omit({
  tenantId: true,
});

export type DatastoreProfileUpdateInput = z.infer<typeof DatastoreProfileUpdateSchema>;

/* ─── Profile Store (in-memory, replaceable with DB) ─── */

export class TenantConfigStore {
  private profiles = new Map<string, DatastoreProfile>();

  create(input: DatastoreProfileCreateInput, actor: string): DatastoreProfile {
    const validation = DatastoreProfileCreateSchema.safeParse(input);
    if (!validation.success) {
      throw new Error(`Invalid config: ${validation.error.message}`);
    }

    const now = new Date().toISOString();
    const profile: DatastoreProfile = {
      id: uuid(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      provider: input.provider,
      region: input.region,
      endpoint: input.endpoint,
      authMode: input.authMode,
      encryptionMode: input.encryptionMode,
      allowedDomains: input.allowedDomains,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      createdBy: actor,
    };

    this.profiles.set(profile.id, profile);
    return profile;
  }

  getById(id: string): DatastoreProfile | undefined {
    return this.profiles.get(id);
  }

  getByTenant(tenantId: string): DatastoreProfile[] {
    return Array.from(this.profiles.values()).filter((p) => p.tenantId === tenantId);
  }

  getActive(tenantId: string, projectId?: string): DatastoreProfile | undefined {
    return Array.from(this.profiles.values()).find(
      (p) =>
        p.tenantId === tenantId &&
        p.status === 'active' &&
        (projectId ? p.projectId === projectId : !p.projectId),
    );
  }

  update(id: string, patch: Partial<DatastoreProfileUpdateInput>): DatastoreProfile {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error(`Profile ${id} not found`);

    const updated: DatastoreProfile = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(id, updated);
    return updated;
  }

  setStatus(id: string, status: ProfileStatus): DatastoreProfile {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error(`Profile ${id} not found`);

    existing.status = status;
    existing.updatedAt = new Date().toISOString();
    if (status === 'active') existing.activatedAt = existing.updatedAt;
    this.profiles.set(id, existing);
    return existing;
  }

  setPreflightResult(id: string, result: PreflightResult): DatastoreProfile {
    const existing = this.profiles.get(id);
    if (!existing) throw new Error(`Profile ${id} not found`);

    existing.preflightResult = result;
    existing.updatedAt = new Date().toISOString();
    this.profiles.set(id, existing);
    return existing;
  }

  delete(id: string): boolean {
    return this.profiles.delete(id);
  }

  listAll(): DatastoreProfile[] {
    return Array.from(this.profiles.values());
  }
}

/* ─── Singleton ─── */

let _store: TenantConfigStore | undefined;

export function getTenantConfigStore(): TenantConfigStore {
  if (!_store) _store = new TenantConfigStore();
  return _store;
}

export function resetTenantConfigForTest(): void {
  _store = undefined;
}
