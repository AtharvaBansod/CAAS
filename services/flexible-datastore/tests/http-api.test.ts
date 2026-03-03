/**
 * Tests for HTTP API routes (Fastify inject)
 *
 * Validates all route handlers are wired up correctly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../src/index';
import { resetControlPlaneForTest } from '../src/control-plane';
import { resetRoutingEngineForTest } from '../src/routing';
import { resetFallbackForTest } from '../src/fallback';
import { resetPoolManagerForTest } from '../src/pool';
import { resetGuardProfileManagerForTest } from '../src/guard-profiles';
import { resetMigrationServiceForTest } from '../src/migration';
import { resetSecurityControlsForTest } from '../src/security';
import { resetOpsPlaybookManagerForTest } from '../src/ops';
import { resetResidencyServiceForTest } from '../src/residency';
import { resetCapabilityNegotiatorForTest } from '../src/query';
import { resetRegistryForTest } from '../src/abstraction';
import { getCredentialManager, resetCredentialManagerForTest } from '../src/credentials';

describe('HTTP API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    resetControlPlaneForTest();
    resetRoutingEngineForTest();
    resetFallbackForTest();
    resetPoolManagerForTest();
    resetGuardProfileManagerForTest();
    resetMigrationServiceForTest();
    resetSecurityControlsForTest();
    resetOpsPlaybookManagerForTest();
    resetResidencyServiceForTest();
    resetCapabilityNegotiatorForTest();
    resetRegistryForTest();
    resetCredentialManagerForTest();
    app = await buildServer();
  });

  /* ─── Health ─── */

  it('GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('flexible-datastore');
  });

  /* ─── Control Plane ─── */

  it('POST /api/control-plane/profiles — create profile', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/control-plane/profiles',
      payload: {
        tenantId: 'tenant-1',
        provider: 'mongodb',
        region: 'us-east-1',
        endpoint: 'https://mongo.example.com',
        authMode: 'connection_string',
        encryptionMode: 'provider_managed',
        allowedDomains: ['users', 'messages'],
        _role: 'platform_admin',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.tenantId).toBe('tenant-1');
    expect(body.provider).toBe('mongodb');
  });

  it('GET /api/control-plane/profiles — list profiles', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/control-plane/profiles' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('GET /api/control-plane/profiles/:id — 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/control-plane/profiles/nonexistent' });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/control-plane/audit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/control-plane/audit' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  /* ─── Routing ─── */

  it('POST /api/routing/resolve', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/routing/resolve',
      payload: { tenantId: 'tenant-1', domain: 'users' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.targetProvider).toBeDefined();
  });

  it('GET /api/routing/decisions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/routing/decisions' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  /* ─── Fallback ─── */

  it('GET /api/fallback/status', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/fallback/status' });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/fallback/replay-queue', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/fallback/replay-queue' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.queueLength).toBe('number');
  });

  /* ─── Capabilities ─── */

  it('GET /api/capabilities/:provider', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/capabilities/mongodb' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.transactions).toBe('boolean');
  });

  it('POST /api/capabilities/negotiate', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/capabilities/negotiate',
      payload: { provider: 'mongodb', requiredCaps: ['transactions', 'fullTextSearch'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.compatible).toBeDefined();
  });

  /* ─── Pool Metrics ─── */

  it('GET /api/pools/metrics', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/pools/metrics' });
    expect(res.statusCode).toBe(200);
  });

  /* ─── Guard Profiles ─── */

  it('GET /api/guard-profiles/:provider', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/guard-profiles/mongodb' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provider).toBe('mongodb');
    expect(body.maxRps).toBeGreaterThan(0);
  });

  it('PATCH /api/guard-profiles/:provider', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/guard-profiles/mongodb',
      payload: { maxRps: 9999 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.maxRps).toBe(9999);
  });

  /* ─── Schemas ─── */

  it('GET /api/schemas', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/schemas' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('GET /api/schemas/:provider/:domain/indexes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/schemas/mongodb/users/indexes' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provider).toBe('mongodb');
    expect(body.indexes).toBeDefined();
  });

  /* ─── Migration ─── */

  it('POST /api/migrations', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/migrations',
      payload: { tenantId: 't1', sourceProvider: 'mongodb', targetProvider: 'dynamodb', domains: ['users'] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().phase).toBe('idle');
  });

  it('GET /api/migrations/:id', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/migrations',
      payload: { tenantId: 't1', sourceProvider: 'mongodb', targetProvider: 'dynamodb', domains: ['users'] },
    });
    const id = create.json().id;
    const res = await app.inject({ method: 'GET', url: `/api/migrations/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('POST /api/migrations/:id/transition — dual_write', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/migrations',
      payload: { tenantId: 't2', sourceProvider: 'mongodb', targetProvider: 'dynamodb', domains: ['users'] },
    });
    const id = create.json().id;
    const res = await app.inject({
      method: 'POST',
      url: `/api/migrations/${id}/transition`,
      payload: { action: 'dual_write' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().phase).toBe('dual_write');
  });

  /* ─── Security ─── */

  it('POST /api/security/:tenantId/:provider/encryption', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/security/t1/mongodb/encryption',
      payload: { atRest: 'provider_managed', inTransit: true, fieldLevelFields: [] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('GET /api/security/:tenantId/:provider/compliance', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/security/t1/mongodb/compliance' });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenantId).toBe('t1');
  });

  /* ─── Ops ─── */

  it('GET /api/ops/playbooks', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ops/playbooks' });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBeGreaterThan(0);
  });

  it('POST /api/ops/incidents', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/ops/incidents',
      payload: { category: 'provider_outage', severity: 'high', title: 'DB Down', description: 'Cannot connect' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('open');
  });

  it('GET /api/ops/incidents', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ops/incidents' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  /* ─── Residency ─── */

  it('POST /api/residency/:tenantId/policy', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/residency/t1/policy',
      payload: { allowedRegions: ['us-east-1'], allowedProviders: ['mongodb'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenantId).toBe('t1');
  });

  it('GET /api/residency/:tenantId/policy', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/residency/t1/policy',
      payload: { allowedRegions: ['us-east-1'], allowedProviders: ['mongodb'] },
    });
    const res = await app.inject({ method: 'GET', url: '/api/residency/t1/policy' });
    expect(res.statusCode).toBe(200);
  });

  it('POST /api/residency/:tenantId/legal-holds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/residency/t1/legal-holds',
      payload: { holdName: 'test-hold', reason: 'test', domains: ['messages'], issuedBy: 'legal' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('active');
  });

  it('POST /api/residency/:tenantId/consent + grant', async () => {
    const req = await app.inject({
      method: 'POST',
      url: '/api/residency/t1/consent',
      payload: { consentType: 'data_processing' },
    });
    expect(req.statusCode).toBe(201);
    const consentId = req.json().id;

    const grant = await app.inject({
      method: 'POST',
      url: `/api/residency/consent/${consentId}/grant`,
      payload: { grantedBy: 'admin' },
    });
    expect(grant.statusCode).toBe(200);
    expect(grant.json().status).toBe('granted');
  });

  it('GET /api/residency/:tenantId/evidence', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/residency/t1/evidence' });
    expect(res.statusCode).toBe(200);
    expect(res.json().tenantId).toBe('t1');
  });

  /* ─── Conformance ─── */

  it('POST /api/conformance/run', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/conformance/run',
      payload: { provider: 'mongodb', domain: 'users' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provider).toBe('mongodb');
    expect(body.passed).toBeGreaterThan(0);
  });
});
