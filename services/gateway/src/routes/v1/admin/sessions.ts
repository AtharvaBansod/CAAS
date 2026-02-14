import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const AdminSessionResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  tenant_id: z.string(),
  device_id: z.string().optional(),
  device_info: z.object({
    name: z.string(),
    type: z.string(),
    platform: z.string(),
  }).optional(),
  ip_address: z.string().optional(),
  location: z.string().optional(),
  created_at: z.number(),
  last_activity: z.number(),
  is_active: z.boolean(),
});

export async function adminSessionsRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/admin/users/:userId/sessions
   * List sessions for specific user (admin only)
   */
  fastify.get('/admin/users/:userId/sessions', {
    schema: {
      description: 'List user sessions (admin)',
      tags: ['admin', 'sessions'],
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: z.object({
          sessions: z.array(AdminSessionResponseSchema),
          total: z.number(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = request.params;
    const adminId = request.user?.id;

    try {
      const sessionStore = fastify.sessionStore;
      const sessions = await sessionStore.getUserSessions(userId);

      const sessionList = sessions.map(session => ({
        id: session.id,
        user_id: session.user_id,
        tenant_id: session.tenant_id,
        device_id: session.device_id,
        device_info: session.device_info,
        ip_address: session.ip_address,
        location: session.location,
        created_at: session.created_at,
        last_activity: session.last_activity,
        is_active: session.is_active,
      }));

      return reply.send({
        sessions: sessionList,
        total: sessionList.length,
      });
    } catch (error) {
      request.log.error({ error, userId, adminId }, 'Admin failed to list user sessions');
      return reply.code(500).send({ error: 'Failed to retrieve sessions' });
    }
  });

  /**
   * DELETE /v1/admin/sessions/:id
   * Force logout specific session (admin only)
   */
  fastify.delete('/admin/sessions/:id', {
    schema: {
      description: 'Force logout session (admin)',
      tags: ['admin', 'sessions'],
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        reason: z.string().optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply
  ) => {
    const { id: sessionId } = request.params;
    const { reason = 'admin_forced_logout' } = request.body;
    const adminId = request.user?.id;

    try {
      const sessionStore = fastify.sessionStore;
      const revocationService = fastify.revocationService;

      // Get session details
      const session = await sessionStore.get(sessionId);
      if (!session) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Revoke session
      await revocationService.revokeSession(sessionId, session.user_id, reason);

      // Broadcast revocation event
      await fastify.deviceSync.handleSessionInvalidated(
        fastify.io,
        session.user_id,
        sessionId,
        reason
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'admin_session_revoked',
        actor_id: adminId!,
        resource_type: 'session',
        resource_id: sessionId,
        details: {
          target_user_id: session.user_id,
          reason,
        },
      });

      return reply.send({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      request.log.error({ error, sessionId, adminId }, 'Admin failed to revoke session');
      return reply.code(500).send({ error: 'Failed to revoke session' });
    }
  });

  /**
   * DELETE /v1/admin/users/:userId/sessions
   * Force logout all sessions for user (admin only)
   */
  fastify.delete('/admin/users/:userId/sessions', {
    schema: {
      description: 'Force logout all user sessions (admin)',
      tags: ['admin', 'sessions'],
      params: z.object({
        userId: z.string(),
      }),
      body: z.object({
        reason: z.string().optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          revoked_count: z.number(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Params: { userId: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.params;
    const { reason = 'admin_forced_logout_all' } = request.body;
    const adminId = request.user?.id;

    try {
      const sessionStore = fastify.sessionStore;
      const revocationService = fastify.revocationService;

      // Get all user sessions
      const sessions = await sessionStore.getUserSessions(userId);

      // Revoke all sessions
      for (const session of sessions) {
        await revocationService.revokeSession(session.id, userId, reason);
      }

      // Broadcast revocation event
      await fastify.deviceSync.handleSessionInvalidated(
        fastify.io,
        userId,
        'all',
        reason
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'admin_sessions_revoked_all',
        actor_id: adminId!,
        resource_type: 'session',
        details: {
          target_user_id: userId,
          revoked_count: sessions.length,
          reason,
        },
      });

      return reply.send({
        success: true,
        revoked_count: sessions.length,
      });
    } catch (error) {
      request.log.error({ error, userId, adminId }, 'Admin failed to revoke all user sessions');
      return reply.code(500).send({ error: 'Failed to revoke sessions' });
    }
  });

  /**
   * GET /v1/admin/sessions/active
   * Get all active sessions across platform (admin only)
   */
  fastify.get('/admin/sessions/active', {
    schema: {
      description: 'Get all active sessions (admin)',
      tags: ['admin', 'sessions'],
      querystring: z.object({
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
      response: {
        200: z.object({
          sessions: z.array(AdminSessionResponseSchema),
          total: z.number(),
          limit: z.number(),
          offset: z.number(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Querystring: { limit?: number; offset?: number };
    }>,
    reply: FastifyReply
  ) => {
    const { limit = 100, offset = 0 } = request.query;
    const adminId = request.user?.id;

    try {
      // Note: This is a simplified implementation
      // In production, implement pagination at Redis level
      const sessionStore = fastify.sessionStore;
      
      // Get session keys pattern
      const redis = fastify.redis;
      const keys = await redis.keys('session:*');
      
      const sessions = [];
      for (const key of keys.slice(offset, offset + limit)) {
        const sessionId = key.replace('session:', '');
        const session = await sessionStore.get(sessionId);
        if (session && session.is_active) {
          sessions.push({
            id: session.id,
            user_id: session.user_id,
            tenant_id: session.tenant_id,
            device_id: session.device_id,
            device_info: session.device_info,
            ip_address: session.ip_address,
            location: session.location,
            created_at: session.created_at,
            last_activity: session.last_activity,
            is_active: session.is_active,
          });
        }
      }

      return reply.send({
        sessions,
        total: keys.length,
        limit,
        offset,
      });
    } catch (error) {
      request.log.error({ error, adminId }, 'Admin failed to list active sessions');
      return reply.code(500).send({ error: 'Failed to retrieve active sessions' });
    }
  });
}
