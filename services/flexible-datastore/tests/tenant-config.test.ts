/**
 * Tests for FDB-CONN-001: Tenant Config Store
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getTenantConfigStore, resetTenantConfigForTest } from '../src/tenant-config';

const VALID_INPUT = {
  tenantId: 't1',
  provider: 'mongodb' as const,
  region: 'us-east-1',
  endpoint: 'https://mongo.example.com',
  authMode: 'connection_string' as const,
  encryptionMode: 'provider_managed' as const,
  allowedDomains: ['users' as const],
};

describe('Tenant Config Store', () => {
  beforeEach(() => resetTenantConfigForTest());

  it('should create a profile with valid data', () => {
    const store = getTenantConfigStore();
    const profile = store.create(VALID_INPUT, 'actor-1');
    expect(profile.id).toBeDefined();
    expect(profile.tenantId).toBe('t1');
    expect(profile.status).toBe('draft');
  });

  it('should reject invalid input', () => {
    const store = getTenantConfigStore();
    expect(() => store.create({ ...VALID_INPUT, provider: 'invalid' as any }, 'a')).toThrow();
  });

  it('should get profile by id', () => {
    const store = getTenantConfigStore();
    const profile = store.create(VALID_INPUT, 'actor-1');
    const found = store.getById(profile.id);
    expect(found).toBeDefined();
    expect(found!.tenantId).toBe('t1');
  });

  it('should list profiles by tenant', () => {
    const store = getTenantConfigStore();
    store.create(VALID_INPUT, 'a');
    store.create({ ...VALID_INPUT, tenantId: 't2' }, 'a');
    store.create({ ...VALID_INPUT, tenantId: 't1', region: 'eu-west-1' }, 'a');
    const t1Profiles = store.getByTenant('t1');
    expect(t1Profiles.length).toBe(2);
  });

  it('should set active and get active profile', () => {
    const store = getTenantConfigStore();
    const profile = store.create(VALID_INPUT, 'a');
    store.setStatus(profile.id, 'active');
    const active = store.getActive('t1');
    expect(active).toBeDefined();
    expect(active!.status).toBe('active');
  });

  it('should update profile fields', () => {
    const store = getTenantConfigStore();
    const profile = store.create(VALID_INPUT, 'a');
    const updated = store.update(profile.id, { region: 'eu-west-1' });
    expect(updated.region).toBe('eu-west-1');
  });

  it('should delete a profile', () => {
    const store = getTenantConfigStore();
    const profile = store.create(VALID_INPUT, 'a');
    store.delete(profile.id);
    expect(store.getById(profile.id)).toBeUndefined();
  });
});
