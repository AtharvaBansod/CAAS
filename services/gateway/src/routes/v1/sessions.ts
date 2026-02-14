import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const SessionResponseSchema = z.object({
  id: z.string(),
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
  is_current: z.boolean(),
});

export async function sessionsRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/sessions
   * List current user's active sessions
   */
  fastify.get('/sessions', {
    schema: {
      description: 'List current user sessions',
      tags: ['sessions'],
      response: {
        200: z.object({
          sessions: z.array(SessionResponseSchema),
          total: z.number(),
        }),
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    const currentSessionId = request.session?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Get session store from app context
      const sessionStore = fastify.sessionStore;
      const sessions = await sessionStore.getUserSessions(userId);

      // Map sessions to response format
      const sessionList = sessions.map(session => ({
        id: session.id,
        device_id: session.device_id,
        device_info: session.device_info,
        ip_address: session.ip_address,
        location: session.location,
        created_at: session.created_at,
        last_activity: session.last_activity,
        is_active: session.is_active,
        is_current: session.id === currentSessionId,
      }));

      return reply.send({
        sessions: sessionList,
        total: sessionList.length,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to list sessions');
      return reply.code(500).send({ error: 'Failed to retrieve sessions' });
    }
  });

  /**
   * DELETE /v1/sessions/:id
   * Revoke specific session
   */
  fastify.delete('/sessions/:id', {
    schema: {
      description: 'Revoke specific session',
      tags: ['sessions'],
      params: z.object({
        id: z.string(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = request.user?.id;
    const { id: sessionId } = request.params;
    const currentSessionId = request.session?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Prevent revoking current session
    if (sessionId === currentSessionId) {
      return reply.code(400).send({ error: 'Cannot revoke current session' });
    }

    try {
      const sessionStore = fastify.sessionStore;
      const revocationService = fastify.revocationService;

      // Verify session belongs to user
      const session = await sessionStore.get(sessionId);
      if (!session || session.user_id !== userId) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      // Revoke session
      await revocationService.revokeSession(sessionId, userId, 'user_initiated');

      // Broadcast revocation event
      await fastify.deviceSync.handleSessionInvalidated(
        fastify.io,
        userId,
        sessionId,
        'user_revoked'
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'session_revoked',
        actor_id: userId,
        resource_type: 'session',
        resource_id: sessionId,
        details: { reason: 'user_initiated' },
      });

      return reply.send({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      request.log.error({ error, userId, sessionId }, 'Failed to revoke session');
      return reply.code(500).send({ error: 'Failed to revoke session' });
    }
  });

  /**
   * DELETE /v1/sessions/others
   * Logout all other devices (keep current session)
   */
  fastify.delete('/sessions/others', {
    schema: {
      description: 'Logout all other devices',
      tags: ['sessions'],
      response: {
        200: z.object({
          success: z.boolean(),
          revoked_count: z.number(),
        }),
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    const currentSessionId = request.session?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const sessionStore = fastify.sessionStore;
      const revocationService = fastify.revocationService;

      // Get all user sessions
      const sessions = await sessionStore.getUserSessions(userId);
      
      // Revoke all except current
      let revokedCount = 0;
      for (const session of sessions) {
        if (session.id !== currentSessionId) {
          await revocationService.revokeSession(session.id, userId, 'logout_others');
          revokedCount++;
        }
      }

      // Broadcast revocation event
      await fastify.deviceSync.broadcastSessionUpdate(
        fastify.io,
        userId,
        { logout_others: true }
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'sessions_revoked_others',
        actor_id: userId,
        resource_type: 'session',
        details: { revoked_count: revokedCount },
      });

      return reply.send({
        success: true,
        revoked_count: revokedCount,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to logout other devices');
      return reply.code(500).send({ error: 'Failed to logout other devices' });
    }
  });

  /**
   * DELETE /v1/sessions/all
   * Logout all devices including current
   */
  fastify.delete('/sessions/all', {
    schema: {
      description: 'Logout all devices',
      tags: ['sessions'],
      response: {
        200: z.object({
          success: z.boolean(),
          revoked_count: z.number(),
        }),
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const sessionStore = fastify.sessionStore;
      const revocationService = fastify.revocationService;

      // Get all user sessions
      const sessions = await sessionStore.getUserSessions(userId);
      
      // Revoke all sessions
      for (const session of sessions) {
        await revocationService.revokeSession(session.id, userId, 'logout_all');
      }

      // Broadcast revocation event
      await fastify.deviceSync.handleSessionInvalidated(
        fastify.io,
        userId,
        'all',
        'user_logout_all'
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'sessions_revoked_all',
        actor_id: userId,
        resource_type: 'session',
        details: { revoked_count: sessions.length },
      });

      return reply.send({
        success: true,
        revoked_count: sessions.length,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to logout all devices');
      return reply.code(500).send({ error: 'Failed to logout all devices' });
    }
  });
}
