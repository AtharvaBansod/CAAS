/**
 * Metrics Endpoint
 * Phase 5 - Observability
 * 
 * Exposes Prometheus metrics for scraping
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { metricsService } from '../../services/metrics';
import { telemetryMetrics } from '../../instrumentation';

export async function metricsRoutes(fastify: FastifyInstance) {
  /**
   * GET /metrics
   * Prometheus metrics endpoint
   */
  fastify.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get metrics from both the legacy metrics service and telemetry package
      const legacyMetrics = await metricsService.getMetrics();
      const telemetryMetricsData = await telemetryMetrics.getMetrics();
      
      // Combine metrics (telemetry package metrics are prefixed with service name)
      const combinedMetrics = `${legacyMetrics}\n${telemetryMetricsData}`;
      
      reply
        .header('Content-Type', 'text/plain; version=0.0.4')
        .send(combinedMetrics);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to generate metrics');
      reply.code(500).send({ error: 'Failed to generate metrics' });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      status: 'healthy',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
}
