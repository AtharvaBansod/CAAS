/**
 * User Sessions Route
 * GET /v1/sessions - List user's active sessions
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const responseSchema = z.object({
  sessions: z.array(z.object({
    id: z.string(),
    device: z.object({
      type: z.enum(['web', 'mobile', 'desktop', 'sdk']),
      os: z.string(),
      browser: z.string().optional(),
      app_version: z.string().optional(),
    }),
    location: z.object({
      country: z.string(),
      city: z.string().optional(),
    }).optional(),
    ip_address: z.string(),
    created_at: z.string(),
    last_activity: z.string(),
    is_current: z.boolean(),
  })),
  total: z.number(),
});

export const userSessionsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/sessions', {
    schema: {
      description: 'List user\'s active sessions',
      tags: ['sessions'],
      security: [{ bearerAuth: [] }],
      response: {
        200: responseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const currentSessionId = request.user.session_id;

    // Get session service from app context
    const sessionService = fastify.authServices.getSessionService();
    
    // Get all user sessions
    const sessions = await sessionService.getUserSessions(userId);

    // Format response
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      device: session.device_info,
      location: session.location,
      ip_address: maskIPAddress(session.ip_address),
      created_at: new Date(session.created_at).toISOString(),
      last_activity: new Date(session.last_activity).toISOString(),
      is_current: session.id === currentSessionId,
    }));

    // Sort by last activity (most recent first)
    formattedSessions.sort((a, b) => 
      new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
    );

    return reply.send({
      sessions: formattedSessions,
      total: formattedSessions.length,
    });
  });
};

/**
 * Mask IP address for privacy (show only first two octets)
 */
function maskIPAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  // IPv6 or other format - mask last half
  const halfLength = Math.floor(ip.length / 2);
  return ip.substring(0, halfLength) + 'x'.repeat(ip.length - halfLength);
}
