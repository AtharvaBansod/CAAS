/**
 * Authorization Audit Logs API Routes
 *
 * Admin endpoints for querying authorization/audit logs
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

function resolveTenant(request: any, providedTenant?: string): string | null {
  const authTenant = request.auth?.tenant_id || request.user?.tenant_id || request.user?.tenantId;
  if (!authTenant) return null;
  if (providedTenant && providedTenant !== authTenant) return null;
  return authTenant;
}

const auditLogsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/authorization',
    {
      schema: {
        tags: ['Admin', 'Audit'],
        summary: 'Query authorization audit logs',
        querystring: Type.Object({
          tenant_id: Type.Optional(Type.String()),
          user_id: Type.Optional(Type.String()),
          resource_type: Type.Optional(Type.String()),
          resource_id: Type.Optional(Type.String()),
          action: Type.Optional(Type.String()),
          start_date: Type.Optional(Type.String()),
          end_date: Type.Optional(Type.String()),
          limit: Type.Optional(Type.Number({ default: 50 })),
          offset: Type.Optional(Type.Number({ default: 0 })),
        }),
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as any;
        const tenantId = resolveTenant(request as any, query.tenant_id);
        if (!tenantId) {
          return reply.code(403).send({
            success: false,
            error: 'Unauthorized tenant scope',
            code: 'identity_context_mismatch',
          });
        }

        const limit = Math.min(200, Math.max(1, Number(query.limit || 50)));
        const offset = Math.max(0, Number(query.offset || 0));
        const filters: Record<string, unknown> = { tenant_id: tenantId };
        if (query.user_id) filters.user_id = query.user_id;
        if (query.resource_type) filters.resource_type = query.resource_type;
        if (query.resource_id) filters.resource_id = query.resource_id;
        if (query.action) filters.action = query.action;

        if (query.start_date || query.end_date) {
          const startDate = query.start_date ? new Date(query.start_date) : null;
          const endDate = query.end_date ? new Date(query.end_date) : null;
          filters.created_at = {
            ...(startDate && !Number.isNaN(startDate.getTime()) ? { $gte: startDate } : {}),
            ...(endDate && !Number.isNaN(endDate.getTime()) ? { $lte: endDate } : {}),
          };
        }

        const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
        const [total, entries] = await Promise.all([
          collection.countDocuments(filters),
          collection.find(filters).sort({ created_at: -1 }).skip(offset).limit(limit).toArray(),
        ]);

        return reply.send({
          success: true,
          data: {
            entries,
            total,
            limit,
            offset,
          },
        });
      } catch (error: any) {
        request.log.error({ err: error }, 'Failed to query authorization audit logs');
        return reply.code(503).send({
          success: false,
          error: 'Failed to query authorization audit logs',
        });
      }
    }
  );

  fastify.get(
    '/authorization/stats',
    {
      schema: {
        tags: ['Admin', 'Audit'],
        summary: 'Get authorization statistics',
        querystring: Type.Object({
          tenant_id: Type.Optional(Type.String()),
          start_date: Type.Optional(Type.String()),
          end_date: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as any;
        const tenantId = resolveTenant(request as any, query.tenant_id);
        if (!tenantId) {
          return reply.code(403).send({
            success: false,
            error: 'Unauthorized tenant scope',
            code: 'identity_context_mismatch',
          });
        }

        const filters: Record<string, unknown> = { tenant_id: tenantId };
        if (query.start_date || query.end_date) {
          const startDate = query.start_date ? new Date(query.start_date) : null;
          const endDate = query.end_date ? new Date(query.end_date) : null;
          filters.created_at = {
            ...(startDate && !Number.isNaN(startDate.getTime()) ? { $gte: startDate } : {}),
            ...(endDate && !Number.isNaN(endDate.getTime()) ? { $lte: endDate } : {}),
          };
        }

        const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
        const [totalDecisions, deniedCount] = await Promise.all([
          collection.countDocuments(filters),
          collection.countDocuments({
            ...filters,
            'metadata.status_code': { $gte: 400 },
          }),
        ]);
        const allowCount = Math.max(0, totalDecisions - deniedCount);

        return reply.send({
          success: true,
          data: {
            total_decisions: totalDecisions,
            allow_count: allowCount,
            deny_count: deniedCount,
            allow_rate: totalDecisions > 0 ? (allowCount / totalDecisions) * 100 : 0,
            deny_rate: totalDecisions > 0 ? (deniedCount / totalDecisions) * 100 : 0,
            avg_duration_ms: 0,
            cache_hit_rate: 0,
          },
        });
      } catch (error: any) {
        request.log.error({ err: error }, 'Failed to fetch authorization audit stats');
        return reply.code(503).send({
          success: false,
          error: 'Failed to fetch authorization audit stats',
        });
      }
    }
  );

  fastify.get(
    '/authorization/export',
    {
      schema: {
        tags: ['Admin', 'Audit'],
        summary: 'Export authorization audit logs',
        querystring: Type.Object({
          tenant_id: Type.Optional(Type.String()),
          format: Type.Optional(Type.Union([Type.Literal('json'), Type.Literal('csv')])),
          start_date: Type.Optional(Type.String()),
          end_date: Type.Optional(Type.String()),
          limit: Type.Optional(Type.Number({ default: 500 })),
        }),
      },
    },
    async (request, reply) => {
      try {
        const query = request.query as any;
        const tenantId = resolveTenant(request as any, query.tenant_id);
        if (!tenantId) {
          return reply.code(403).send({
            success: false,
            error: 'Unauthorized tenant scope',
            code: 'identity_context_mismatch',
          });
        }

        const format = query.format || 'json';
        const limit = Math.min(5000, Math.max(1, Number(query.limit || 500)));
        const filters: Record<string, unknown> = { tenant_id: tenantId };
        if (query.start_date || query.end_date) {
          const startDate = query.start_date ? new Date(query.start_date) : null;
          const endDate = query.end_date ? new Date(query.end_date) : null;
          filters.created_at = {
            ...(startDate && !Number.isNaN(startDate.getTime()) ? { $gte: startDate } : {}),
            ...(endDate && !Number.isNaN(endDate.getTime()) ? { $lte: endDate } : {}),
          };
        }

        const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
        const entries = await collection.find(filters).sort({ created_at: -1 }).limit(limit).toArray();

        if (format === 'csv') {
          const header = 'audit_id,tenant_id,user_id,action,resource_type,resource_id,status_code,timestamp';
          const lines = entries.map((entry: any) =>
            [
              entry.audit_id,
              entry.tenant_id,
              entry.user_id || '',
              entry.action || '',
              entry.resource_type || '',
              entry.resource_id || '',
              entry.metadata?.status_code || '',
              entry.created_at instanceof Date ? entry.created_at.toISOString() : new Date(entry.created_at || Date.now()).toISOString(),
            ]
              .map((value) => `"${String(value).replace(/"/g, '""')}"`)
              .join(',')
          );
          reply.header('Content-Type', 'text/csv');
          reply.header('Content-Disposition', 'attachment; filename=audit-logs.csv');
          return reply.send([header, ...lines].join('\n'));
        }

        return reply.send({
          success: true,
          data: entries,
        });
      } catch (error: any) {
        request.log.error({ err: error }, 'Failed to export authorization audit logs');
        return reply.code(503).send({
          success: false,
          error: 'Failed to export authorization audit logs',
        });
      }
    }
  );
};

export default auditLogsRoutes;
