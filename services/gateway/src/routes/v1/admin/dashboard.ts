/**
 * Compliance Dashboard Routes
 * 
 * Real-time compliance metrics for dashboards
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // Get compliance dashboard data
  fastify.get(
    '/compliance',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get compliance dashboard metrics',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              gdpr: Type.Object({
                pending_requests: Type.Number(),
                completed_requests: Type.Number(),
                consent_rate: Type.Number(),
              }),
              retention: Type.Object({
                active_policies: Type.Number(),
                records_deleted_today: Type.Number(),
                next_execution: Type.String(),
              }),
              audit: Type.Object({
                total_events_today: Type.Number(),
                security_events: Type.Number(),
                failed_auth_attempts: Type.Number(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with actual services
      reply.send({
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
            next_execution: new Date().toISOString(),
          },
          audit: {
            total_events_today: 0,
            security_events: 0,
            failed_auth_attempts: 0,
          },
        },
      });
    }
  );

  // Get security dashboard data
  fastify.get(
    '/security',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get security dashboard metrics',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              authentication: Type.Object({
                total_logins_today: Type.Number(),
                failed_logins_today: Type.Number(),
                mfa_enabled_percentage: Type.Number(),
              }),
              authorization: Type.Object({
                total_checks_today: Type.Number(),
                denied_percentage: Type.Number(),
              }),
              ip_security: Type.Object({
                blocked_ips: Type.Number(),
                blocked_requests_today: Type.Number(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with actual services
      reply.send({
        success: true,
        data: {
          authentication: {
            total_logins_today: 0,
            failed_logins_today: 0,
            mfa_enabled_percentage: 0,
          },
          authorization: {
            total_checks_today: 0,
            denied_percentage: 0,
          },
          ip_security: {
            blocked_ips: 0,
            blocked_requests_today: 0,
          },
        },
      });
    }
  );

  // Get privacy dashboard data
  fastify.get(
    '/privacy',
    {
      schema: {
        tags: ['Admin', 'Dashboard'],
        summary: 'Get privacy dashboard metrics',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              data_exports: Type.Object({
                pending: Type.Number(),
                completed_this_month: Type.Number(),
              }),
              data_erasure: Type.Object({
                pending: Type.Number(),
                completed_this_month: Type.Number(),
              }),
              consent: Type.Object({
                total_users: Type.Number(),
                consented_percentage: Type.Number(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with actual services
      reply.send({
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
        },
      });
    }
  );

  // Unified Dashboard for Admin Portal (Phase 6)
  fastify.get(
    '/dashboard',
    async (request, reply) => {
      try {
        // Get tenant_id from authenticated user
        const user = (request as any).user;
        if (!user || !user.tenant_id) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Authentication required',
          });
        }

        const tenantId = user.tenant_id;

        // Get MongoDB client from Fastify instance
        const mongoClient = (fastify as any).mongo?.client;
        if (!mongoClient) {
          fastify.log.error('MongoDB client not available');
          return reply.code(500).send({
            error: 'Internal Server Error',
            message: 'Database connection not available',
          });
        }

        // Import and use dashboard stats service
        const { DashboardStatsService } = await import('../../../services/dashboard-stats');
        const statsService = new DashboardStatsService(mongoClient);

        // Fetch real data
        const [stats, recent_activity] = await Promise.all([
          statsService.getStats(tenantId),
          statsService.getRecentActivity(tenantId, 5),
        ]);

        return {
          stats,
          recent_activity,
        };
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching dashboard data');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch dashboard data',
        });
      }
    }
  );
};

export default dashboardRoutes;
