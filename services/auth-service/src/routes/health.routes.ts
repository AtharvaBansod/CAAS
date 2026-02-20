/**
 * Health Check Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  server.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check database connections
    try {
      // Add actual health checks here
      return reply.send({
        status: 'ready',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
