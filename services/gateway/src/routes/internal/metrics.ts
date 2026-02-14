/**
 * Metrics Routes
 * 
 * Prometheus metrics endpoint
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsService } from '../../services/metrics';

export async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * Prometheus metrics endpoint
   * Should be exposed on a separate port (3001) for security
   */
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await metricsService.getMetrics();
    
    return reply
      .code(200)
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(metrics);
  });
}
