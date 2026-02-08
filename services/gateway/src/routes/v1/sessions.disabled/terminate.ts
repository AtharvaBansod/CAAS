/**
 * Session Termination Routes
 * DELETE /v1/sessions/:id - Terminate specific session
 * POST /v1/sessions/terminate-all - Terminate all user sessions
 * POST /v1/sessions/terminate-others - Terminate all except current session
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const terminateParamsSchema = z.object({
  id: z.string().uuid(),
});

const terminateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const terminateAllResponseSchema = z.object({
  success: z.boolean(),
  terminated_count: z.number(),
  message: z.string(),
});

export const terminateRoute: FastifyPluginAsync = async (fastify) => {
  // DELETE /v1/sessions/:id - Terminate specific session
  fastify.delete<{
    Params: z.infer<typeof terminateParamsSchema>;
  }>('/sessions/:id', {
    schema: {
      description: 'Terminate a specific session',
      tags: ['sessions'],
      security: [{ bearerAuth: [] }],
      params: terminateParamsSchema,
      response: {
        200: terminateResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const { id: sessionId } = request.params;
    const userId = request.user.sub;

    const sessionService = fastify.authServices.getSessionService();

    // Verify session belongs to user
    const session = await sessionService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      return reply.code(404).send({
        success: false,
        message: 'Session not found',
      });
    }

    // Terminate session
    await sessionService.terminateSession(sessionId);

    // Log the termination
    fastify.log.info({ userId, sessionId }, 'Session terminated by user');

    return reply.send({
      success: true,
      message: 'Session terminated successfully',
    });
  });

  // POST /v1/sessions/terminate-all - Terminate all user sessions
  fastify.post('/sessions/terminate-all', {
    schema: {
      description: 'Terminate all user sessions (requires re-authentication)',
      tags: ['sessions'],
      security: [{ bearerAuth: [] }],
      response: {
        200: terminateAllResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    const sessionService = fastify.authServices.getSessionService();

    // Terminate all sessions
    const count = await sessionService.terminateAllSessions(userId);

    // Log the termination
    fastify.log.warn({ userId, count }, 'All user sessions terminated');

    return reply.send({
      success: true,
      terminated_count: count,
      message: `${count} session(s) terminated successfully`,
    });
  });

  // POST /v1/sessions/terminate-others - Terminate all except current
  fastify.post('/sessions/terminate-others', {
    schema: {
      description: 'Terminate all sessions except the current one',
      tags: ['sessions'],
      security: [{ bearerAuth: [] }],
      response: {
        200: terminateAllResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const currentSessionId = request.user.session_id;

    const sessionService = fastify.authServices.getSessionService();

    // Terminate all sessions except current
    const count = await sessionService.terminateAllSessions(userId, currentSessionId);

    // Log the termination
    fastify.log.info({ userId, currentSessionId, count }, 'Other sessions terminated');

    return reply.send({
      success: true,
      terminated_count: count,
      message: `${count} other session(s) terminated successfully`,
    });
  });
};
