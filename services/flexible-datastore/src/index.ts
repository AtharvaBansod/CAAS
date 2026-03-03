/**
 * Flexible Datastore Service — Fastify HTTP entry point
 *
 * Exposes control-plane APIs, health checks, provider management,
 * migration, security, ops, residency, and guard-profile endpoints.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getControlPlaneService, resetControlPlaneForTest } from './control-plane';
import { getRoutingEngine } from './routing';
import { getFallbackController } from './fallback';
import { getConnectionPoolManager } from './pool';
import { getGuardProfileManager } from './guard-profiles';
import { getMigrationService } from './migration';
import { getSecurityControlsService } from './security';
import { getOpsPlaybookManager } from './ops';
import { getResidencyService } from './residency';
import { getCapabilityNegotiator } from './query';
import { ENTITY_SCHEMAS, getIndexStrategy } from './schema-mapping';
import { ProviderConformanceSuite } from './test-harness';
import { getRepositoryRegistry } from './abstraction';
import { MongoDBAdapterFactory } from './drivers/mongodb/adapter';
import { DynamoDBAdapterFactory } from './drivers/dynamodb/adapter';
import { FirestoreAdapterFactory } from './drivers/firestore/adapter';
import { CosmosDBAdapterFactory } from './drivers/cosmosdb/adapter';
import { ProviderId, EntityDomain } from './types';

/* ─── Bootstrap ─── */

export async function buildServer() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  /* ─── Register built-in adapter factories ─── */
  const registry = getRepositoryRegistry();
  if (registry.listProviders().length === 0) {
    registry.register('mongodb', new MongoDBAdapterFactory());
    registry.register('dynamodb', new DynamoDBAdapterFactory());
    registry.register('firestore', new FirestoreAdapterFactory());
    registry.register('cosmosdb', new CosmosDBAdapterFactory());
  }

  /* ─── Health ─── */

  app.get('/health', async () => ({ status: 'ok', service: 'flexible-datastore', timestamp: new Date().toISOString() }));

  /* ═══════════════════════════════════════════
   *  Control-Plane APIs (FDB-CONN-004)
   * ═══════════════════════════════════════════ */

  app.post<{ Body: any }>('/api/control-plane/profiles', async (req, reply) => {
    const cp = getControlPlaneService();
    try {
      const body = req.body as any;
      const actor = {
        actorId: body._actorId ?? 'api',
        tenantId: body.tenantId ?? body._tenantId ?? 'system',
        role: body._role ?? 'platform_admin',
      };
      const profile = cp.createProfile(body, actor);
      return reply.code(201).send(profile);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get<{ Params: { id: string } }>('/api/control-plane/profiles/:id', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    const profile = cp.getProfile(req.params.id, actor);
    if (!profile) return reply.code(404).send({ error: 'not found' });
    return profile;
  });

  app.get<{ Querystring: { tenantId?: string } }>('/api/control-plane/profiles', async (req) => {
    const cp = getControlPlaneService();
    const actor = {
      actorId: 'api',
      tenantId: req.query.tenantId ?? 'system',
      role: 'platform_admin' as const,
    };
    return cp.listProfiles(actor);
  });

  app.post<{ Params: { id: string } }>('/api/control-plane/profiles/:id/preflight', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    try {
      const result = cp.runPreflight(req.params.id, actor);
      return result;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/control-plane/profiles/:id/activate', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    try {
      const profile = cp.activateProfile(req.params.id, actor);
      return profile;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/control-plane/profiles/:id/deactivate', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    try {
      const profile = cp.deactivateProfile(req.params.id, actor);
      return profile;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/control-plane/profiles/:id', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    try {
      cp.deleteProfile(req.params.id, actor);
      return reply.code(204).send();
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/control-plane/profiles/:id/test-connection', async (req, reply) => {
    const cp = getControlPlaneService();
    const actor = { actorId: 'api', tenantId: 'system', role: 'platform_admin' as const };
    try {
      const result = cp.testConnection(req.params.id, actor);
      return result;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/control-plane/audit', async () => {
    const cp = getControlPlaneService();
    return cp.getAuditEvents();
  });

  /* ═══════════════════════════════════════════
   *  Routing (FDB-ABS-002)
   * ═══════════════════════════════════════════ */

  app.post<{ Body: { tenantId: string; projectId?: string; domain: EntityDomain } }>('/api/routing/resolve', async (req) => {
    const engine = getRoutingEngine();
    return engine.resolve(req.body.tenantId, req.body.domain as EntityDomain, req.body.projectId);
  });

  app.get('/api/routing/decisions', async () => {
    const engine = getRoutingEngine();
    return engine.getRecentDecisions();
  });

  /* ═══════════════════════════════════════════
   *  Fallback / Circuit Breaker (FDB-ABS-003)
   * ═══════════════════════════════════════════ */

  app.get('/api/fallback/status', async () => {
    const fb = getFallbackController();
    return fb.getAllHealth();
  });

  app.get('/api/fallback/replay-queue', async () => {
    const fb = getFallbackController();
    return { queueLength: fb.replayQueueSize() };
  });

  /* ═══════════════════════════════════════════
   *  Capabilities (FDB-ABS-004)
   * ═══════════════════════════════════════════ */

  app.get<{ Params: { provider: string } }>('/api/capabilities/:provider', async (req, reply) => {
    const negotiator = getCapabilityNegotiator();
    try {
      return negotiator.getCapabilities(req.params.provider as ProviderId);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.post<{ Body: { provider: ProviderId; requiredCaps: string[] } }>('/api/capabilities/negotiate', async (req) => {
    const negotiator = getCapabilityNegotiator();
    return negotiator.negotiate(req.body.provider, req.body.requiredCaps as any);
  });

  /* ═══════════════════════════════════════════
   *  Connection Pool (FDB-CONN-003)
   * ═══════════════════════════════════════════ */

  app.get('/api/pools/metrics', async () => {
    const pm = getConnectionPoolManager();
    return pm.getAllMetrics();
  });

  /* ═══════════════════════════════════════════
   *  Guard Profiles (FDB-DRV-004)
   * ═══════════════════════════════════════════ */

  app.get<{ Params: { provider: string } }>('/api/guard-profiles/:provider', async (req) => {
    const gm = getGuardProfileManager();
    return gm.getProfile(req.params.provider as ProviderId);
  });

  app.patch<{ Params: { provider: string }; Body: any }>('/api/guard-profiles/:provider', async (req) => {
    const gm = getGuardProfileManager();
    return gm.updateProfile(req.params.provider as ProviderId, req.body as any);
  });

  /* ═══════════════════════════════════════════
   *  Schema Mapping (FDB-DRV-002)
   * ═══════════════════════════════════════════ */

  app.get('/api/schemas', async () => ENTITY_SCHEMAS);

  app.get<{ Params: { provider: string; domain: string } }>('/api/schemas/:provider/:domain/indexes', async (req) => {
    return getIndexStrategy(req.params.provider as ProviderId, req.params.domain as EntityDomain);
  });

  /* ═══════════════════════════════════════════
   *  Migration (FDB-OPS-001)
   * ═══════════════════════════════════════════ */

  app.post<{ Body: any }>('/api/migrations', async (req, reply) => {
    const ms = getMigrationService();
    try {
      const body = req.body as any;
      const plan = ms.createPlan(body.tenantId, body.sourceProvider, body.targetProvider, body.domains, body.criteria);
      return reply.code(201).send(plan);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get<{ Params: { id: string } }>('/api/migrations/:id', async (req, reply) => {
    const ms = getMigrationService();
    const plan = ms.getPlan(req.params.id);
    if (!plan) return reply.code(404).send({ error: 'not found' });
    return plan;
  });

  app.post<{ Params: { id: string }; Body: { action: string; reason?: string } }>('/api/migrations/:id/transition', async (req, reply) => {
    const ms = getMigrationService();
    try {
      switch (req.body.action) {
        case 'dual_write': return ms.startDualWrite(req.params.id);
        case 'shadow_read': return ms.startShadowRead(req.params.id);
        case 'cutover': return ms.cutover(req.params.id);
        case 'complete': return ms.completeMigration(req.params.id);
        case 'rollback': return ms.rollback(req.params.id, req.body.reason ?? 'manual rollback');
        default: return reply.code(400).send({ error: `unknown action ${req.body.action}` });
      }
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /* ═══════════════════════════════════════════
   *  Security (FDB-OPS-002)
   * ═══════════════════════════════════════════ */

  app.post<{ Params: { tenantId: string; provider: string }; Body: any }>('/api/security/:tenantId/:provider/encryption', async (req) => {
    const sc = getSecurityControlsService();
    sc.setEncryptionPolicy(req.params.tenantId, req.params.provider as ProviderId, req.body as any);
    return { ok: true };
  });

  app.get<{ Params: { tenantId: string; provider: string } }>('/api/security/:tenantId/:provider/compliance', async (req) => {
    const sc = getSecurityControlsService();
    return sc.generateComplianceReport(req.params.tenantId, req.params.provider as ProviderId);
  });

  /* ═══════════════════════════════════════════
   *  Ops Playbooks (FDB-OPS-003)
   * ═══════════════════════════════════════════ */

  app.get('/api/ops/playbooks', async () => {
    const om = getOpsPlaybookManager();
    return om.listPlaybooks();
  });

  app.post<{ Body: any }>('/api/ops/incidents', async (req, reply) => {
    const om = getOpsPlaybookManager();
    const body = req.body as any;
    const inc = om.createIncident(body.category, body.severity, body.title, body.description, { provider: body.provider, tenantId: body.tenantId });
    return reply.code(201).send(inc);
  });

  app.get('/api/ops/incidents', async () => {
    const om = getOpsPlaybookManager();
    return om.listOpenIncidents();
  });

  app.post<{ Params: { id: string }; Body: { action: string; actor: string; details?: string } }>('/api/ops/incidents/:id/action', async (req, reply) => {
    const om = getOpsPlaybookManager();
    try {
      switch (req.body.action) {
        case 'acknowledge': return om.acknowledgeIncident(req.params.id, req.body.actor);
        case 'mitigate': return om.mitigateIncident(req.params.id, req.body.actor, req.body.details ?? '');
        case 'resolve': return om.resolveIncident(req.params.id, req.body.actor, req.body.details ?? '');
        default: return reply.code(400).send({ error: `unknown action ${req.body.action}` });
      }
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  /* ═══════════════════════════════════════════
   *  Residency & Legal Hold (FDB-OPS-004)
   * ═══════════════════════════════════════════ */

  app.post<{ Params: { tenantId: string }; Body: any }>('/api/residency/:tenantId/policy', async (req) => {
    const rs = getResidencyService();
    const body = req.body as any;
    return rs.setPolicy(req.params.tenantId, body.allowedRegions, body.allowedProviders, body.blockCrossRegion);
  });

  app.get<{ Params: { tenantId: string } }>('/api/residency/:tenantId/policy', async (req, reply) => {
    const rs = getResidencyService();
    const p = rs.getPolicy(req.params.tenantId);
    if (!p) return reply.code(404).send({ error: 'no policy' });
    return p;
  });

  app.post<{ Params: { tenantId: string }; Body: any }>('/api/residency/:tenantId/legal-holds', async (req, reply) => {
    const rs = getResidencyService();
    try {
      const body = req.body as any;
      const hold = rs.createLegalHold(req.params.tenantId, body.holdName, body.reason, body.domains, body.issuedBy);
      return reply.code(201).send(hold);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get<{ Params: { tenantId: string } }>('/api/residency/:tenantId/legal-holds', async (req) => {
    const rs = getResidencyService();
    return rs.getActiveLegalHolds(req.params.tenantId);
  });

  app.post<{ Params: { tenantId: string }; Body: { consentType: string } }>('/api/residency/:tenantId/consent', async (req, reply) => {
    const rs = getResidencyService();
    const consent = rs.requestConsent(req.params.tenantId, req.body.consentType);
    return reply.code(201).send(consent);
  });

  app.post<{ Params: { consentId: string }; Body: { grantedBy: string } }>('/api/residency/consent/:consentId/grant', async (req) => {
    const rs = getResidencyService();
    return rs.grantConsent(req.params.consentId, req.body.grantedBy);
  });

  app.get<{ Params: { tenantId: string } }>('/api/residency/:tenantId/evidence', async (req) => {
    const rs = getResidencyService();
    return rs.generateEvidence(req.params.tenantId, 'full_compliance');
  });

  /* ═══════════════════════════════════════════
   *  Conformance (FDB-DRV-003)
   * ═══════════════════════════════════════════ */

  app.post<{ Body: { provider: ProviderId; domain: EntityDomain } }>('/api/conformance/run', async (req, reply) => {
    const registry = getRepositoryRegistry();
    const body = req.body as any;
    const factory = registry.getFactory(body.provider);
    if (!factory) return reply.code(400).send({ error: `no factory for provider ${body.provider}` });
    const repo = factory.create(body.domain);
    const suite = new ProviderConformanceSuite(body.provider, body.domain, repo);
    const result = await suite.runAll();
    return result;
  });

  return app;
}

/* ─── Start ─── */

async function main() {
  const app = await buildServer();
  const port = parseInt(process.env.PORT ?? '4100', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`flexible-datastore listening on ${host}:${port}`);
}

// Only auto-start when run directly (not during tests)
if (require.main === module) {
  main().catch((err) => {
    console.error('Failed to start flexible-datastore:', err);
    process.exit(1);
  });
}
