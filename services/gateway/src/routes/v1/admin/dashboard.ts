/**
 * Admin Dashboard Routes
 *
 * Real-data contracts for admin dashboard, monitoring and capability manifest.
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { healthCheckService } from '../../../services/health-check';

type CapabilityState = 'real' | 'degraded' | 'blocked';

type CapabilityItem = {
  route: string;
  state: CapabilityState;
  owner: string;
  description: string;
};

const DEFAULT_CAPABILITIES: CapabilityItem[] = [
  { route: '/dashboard', state: 'real', owner: 'gateway/admin-dashboard', description: 'Tenant dashboard statistics and recent activity.' },
  { route: '/dashboard/api-keys', state: 'real', owner: 'auth/client-api-keys', description: 'Live API key rotate/promote/revoke operations.' },
  { route: '/dashboard/security', state: 'real', owner: 'auth/client-whitelists', description: 'IP and origin whitelist management.' },
  { route: '/dashboard/settings', state: 'real', owner: 'gateway/tenant-settings', description: 'Tenant settings read/update with persisted feature flags.' },
  { route: '/dashboard/audit-logs', state: 'real', owner: 'gateway/audit-query', description: 'Paginated audit logs from compliance datastore.' },
  { route: '/dashboard/monitoring', state: 'degraded', owner: 'gateway/admin-monitoring', description: 'Real health/traffic metrics where data sources are available.' },
  { route: '/dashboard/team', state: 'blocked', owner: 'pending-backend/team-management', description: 'Team management endpoints are not implemented yet.' },
  { route: '/dashboard/billing', state: 'blocked', owner: 'pending-backend/billing', description: 'Billing/invoice APIs are not implemented yet.' },
  { route: '/dashboard/docs', state: 'real', owner: 'admin-portal/static-docs', description: 'Documentation links and static integration guides.' },
];

function getTenantId(request: any): string | null {
  return request?.auth?.tenant_id || request?.user?.tenant_id || request?.user?.tenantId || null;
}

async function ensureTenantRecord(
  fastify: any,
  tenantId: string
): Promise<{ tenant_id: string; client_id?: string; company_name?: string; plan?: string } | null> {
  const collection = fastify.mongo?.client?.db('caas_platform')?.collection('clients');
  if (!collection) return null;
  const record = await collection.findOne(
    { tenant_id: tenantId, status: { $ne: 'deleted' } },
    { projection: { tenant_id: 1, client_id: 1, company_name: 1, plan: 1 } }
  );
  return record as any;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function normalizeHttpBase(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('ws://')) return `http://${url.slice('ws://'.length)}`;
  if (url.startsWith('wss://')) return `https://${url.slice('wss://'.length)}`;
  return url;
}

async function probeService(name: string, baseUrl: string): Promise<{ name: string; status: 'healthy' | 'degraded' | 'down'; latency_ms: number | null; source: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const startedAt = Date.now();
  try {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/health`;
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'x-correlation-id': `monitor_${Date.now()}` },
    });
    const latency = Date.now() - startedAt;
    const status = response.ok ? (latency > 1500 ? 'degraded' : 'healthy') : 'down';
    return { name, status, latency_ms: latency, source: endpoint };
  } catch (error: any) {
    return {
      name,
      status: 'down',
      latency_ms: null,
      source: baseUrl,
      error: error?.message || 'request_failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function resolveCapabilitiesFromEnv(): CapabilityItem[] {
  const raw = process.env.ADMIN_CAPABILITY_MANIFEST_JSON;
  if (!raw) return DEFAULT_CAPABILITIES;
  try {
    const parsed = JSON.parse(raw) as CapabilityItem[];
    if (!Array.isArray(parsed)) return DEFAULT_CAPABILITIES;
    return parsed
      .filter((item) => !!item?.route && !!item?.state && !!item?.owner)
      .map((item) => ({
        route: item.route,
        state: item.state,
        owner: item.owner,
        description: item.description || '',
      }));
  } catch {
    return DEFAULT_CAPABILITIES;
  }
}

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/compliance',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get compliance dashboard metrics',
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request as any);
      if (!tenantId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const auditCollection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const [totalEvents, failedEvents] = await Promise.all([
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: startOfDay } }),
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: startOfDay }, 'metadata.status_code': { $gte: 400 } }),
      ]);

      return reply.send({
        success: true,
        data: {
          gdpr: {
            pending_requests: 0,
            completed_requests: 0,
            consent_rate: 0,
          },
          retention: {
            active_policies: 0,
            records_deleted_today: 0,
            next_execution: null,
          },
          audit: {
            total_events_today: totalEvents,
            security_events: failedEvents,
            failed_auth_attempts: failedEvents,
          },
          mode: 'degraded',
          source: 'caas_compliance.audit_logs',
        },
      });
    }
  );

  fastify.get(
    '/security',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get security dashboard metrics',
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request as any);
      if (!tenantId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
      }

      const auditCollection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const [total, failed] = await Promise.all([
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: startOfDay } }),
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: startOfDay }, 'metadata.status_code': { $gte: 400 } }),
      ]);

      return reply.send({
        success: true,
        data: {
          authentication: {
            total_logins_today: total,
            failed_logins_today: failed,
            mfa_enabled_percentage: 0,
          },
          authorization: {
            total_checks_today: total,
            denied_percentage: total > 0 ? Number(((failed / total) * 100).toFixed(2)) : 0,
          },
          ip_security: {
            blocked_ips: 0,
            blocked_requests_today: failed,
          },
          mode: 'degraded',
          source: 'caas_compliance.audit_logs',
        },
      });
    }
  );

  fastify.get(
    '/privacy',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get privacy dashboard metrics',
      },
    },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: {
          data_exports: {
            pending: 0,
            completed_this_month: 0,
          },
          data_erasure: {
            pending: 0,
            completed_this_month: 0,
          },
          consent: {
            total_users: 0,
            consented_percentage: 0,
          },
          mode: 'blocked',
          message: 'Privacy-specific backend data pipelines are not implemented yet.',
        },
      });
    }
  );

  fastify.get('/capabilities', async (_request, reply) => {
    const capabilities = resolveCapabilitiesFromEnv();
    return reply.send({
      generated_at: new Date().toISOString(),
      modules: capabilities,
    });
  });

  fastify.get('/monitoring', async (request, reply) => {
    const tenantId = getTenantId(request as any);
    if (!tenantId) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    try {
      const mongoClient = fastify.mongo?.client;
      if (!mongoClient) {
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Database connection not available',
        });
      }

      const tenantRecord = await ensureTenantRecord(fastify, tenantId);
      if (!tenantRecord) {
        return reply.code(404).send({
          error: 'Tenant not found',
          code: 'tenant_not_found',
          diagnostics: {
            tenant_id: tenantId,
            correlation_id: request.id || request.headers['x-correlation-id'] || null,
            source: 'gateway.admin.monitoring',
          },
        });
      }

      const { DashboardStatsService } = await import('../../../services/dashboard-stats');
      const statsService = new DashboardStatsService(mongoClient);
      const stats = await statsService.getStats(tenantId);

      const health = await healthCheckService.checkHealth(true);
      const auditCollection = mongoClient.db('caas_compliance').collection('audit_logs');

      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const [requestCount, errorCount, recentResponseTimes] = await Promise.all([
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: fifteenMinutesAgo } }),
        auditCollection.countDocuments({ tenant_id: tenantId, created_at: { $gte: fifteenMinutesAgo }, 'metadata.status_code': { $gte: 400 } }),
        auditCollection
          .find(
            {
              tenant_id: tenantId,
              created_at: { $gte: fifteenMinutesAgo },
              'metadata.response_time_ms': { $type: 'number' },
            },
            { projection: { 'metadata.response_time_ms': 1 } }
          )
          .limit(2000)
          .toArray(),
      ]);

      const responseTimeValues = recentResponseTimes
        .map((entry: any) => entry?.metadata?.response_time_ms)
        .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value));

      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const elapsedSecondsToday = Math.max(1, Math.floor((Date.now() - startOfDay.getTime()) / 1000));
      const messagesPerSecond = stats.messages_today > 0 ? Number((stats.messages_today / elapsedSecondsToday).toFixed(4)) : 0;
      const errorRatePercent = requestCount > 0 ? Number(((errorCount / requestCount) * 100).toFixed(2)) : 0;

      const servicesFromHealth = [
        {
          name: 'MongoDB',
          status: health.checks.mongodb?.status === 'up' ? 'healthy' : health.checks.mongodb?.status === 'degraded' ? 'degraded' : 'down',
          latency_ms: health.checks.mongodb?.latency_ms ?? null,
          source: 'gateway health-check',
        },
        {
          name: 'Redis',
          status: health.checks.redis?.status === 'up' ? 'healthy' : health.checks.redis?.status === 'degraded' ? 'degraded' : 'down',
          latency_ms: health.checks.redis?.latency_ms ?? null,
          source: 'gateway health-check',
        },
        {
          name: 'Kafka',
          status: health.checks.kafka?.status === 'up' ? 'healthy' : health.checks.kafka?.status === 'degraded' ? 'degraded' : 'down',
          latency_ms: health.checks.kafka?.latency_ms ?? null,
          source: 'gateway health-check',
        },
      ];

      const externalTargets: Array<{ name: string; url: string | null }> = [
        { name: 'API Gateway', url: `http://127.0.0.1:${process.env.PORT || '3000'}` },
        { name: 'Auth Service', url: normalizeHttpBase(process.env.AUTH_SERVICE_URL) },
        { name: 'Compliance Service', url: normalizeHttpBase(process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008') },
        { name: 'Search Service', url: normalizeHttpBase(process.env.SEARCH_SERVICE_URL || 'http://search-service:3006') },
        { name: 'Media Service', url: normalizeHttpBase(process.env.MEDIA_SERVICE_URL || 'http://media-service:3005') },
        { name: 'Socket Service 1', url: normalizeHttpBase(process.env.SOCKET_SERVICE_1_URL) },
        { name: 'Socket Service 2', url: normalizeHttpBase(process.env.SOCKET_SERVICE_2_URL) },
      ];

      const externalChecks = await Promise.all(
        externalTargets
          .filter((target) => !!target.url)
          .map((target) => probeService(target.name, target.url as string))
      );

      const services = [...servicesFromHealth, ...externalChecks];
      const hasDownService = services.some((service) => service.status === 'down');

      return reply.send({
        generated_at: new Date().toISOString(),
        freshness_ms: 15000,
        mode: hasDownService ? 'degraded' : 'real',
        cards: {
          messages_per_second: messagesPerSecond,
          active_connections: stats.active_connections,
          api_latency_p95_ms: percentile(responseTimeValues, 95),
          error_rate_percent: errorRatePercent,
        },
        services,
        source: {
          stats: 'gateway dashboard-stats + compliance audit logs',
          health: 'gateway health-check + service health endpoints',
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to fetch monitoring data');
      return reply.code(503).send({
        error: 'Monitoring data unavailable',
        code: 'monitoring_unavailable',
      });
    }
  });

  fastify.get('/dashboard', async (request, reply) => {
    try {
      const tenantId = getTenantId(request as any);
      if (!tenantId) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const mongoClient = fastify.mongo?.client;
      if (!mongoClient) {
        fastify.log.error('MongoDB client not available');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Database connection not available',
        });
      }

      const tenantRecord = await ensureTenantRecord(fastify, tenantId);
      if (!tenantRecord) {
        return reply.code(404).send({
          error: 'Tenant not found',
          code: 'tenant_not_found',
          diagnostics: {
            tenant_id: tenantId,
            correlation_id: request.id || request.headers['x-correlation-id'] || null,
            source: 'gateway.admin.dashboard',
          },
        });
      }

      const { DashboardStatsService } = await import('../../../services/dashboard-stats');
      const statsService = new DashboardStatsService(mongoClient);

      const [stats, recent_activity] = await Promise.all([
        statsService.getStats(tenantId),
        statsService.getRecentActivity(tenantId, 5),
      ]);

      return reply.send({
        stats,
        recent_activity,
      });
    } catch (error) {
      fastify.log.error({ err: error }, 'Error fetching dashboard data');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to fetch dashboard data',
      });
    }
  });
};

export default dashboardRoutes;
