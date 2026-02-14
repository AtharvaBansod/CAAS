/**
 * Health Check Routes
 * 
 * Provides liveness, readiness, and detailed health endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { healthCheckService } from '../../services/health-check';

export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * Liveness probe - lightweight check
   * Used by Kubernetes to determine if pod should be restarted
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await healthCheckService.checkLiveness();
    
    return reply.code(200).send({
      status: 'ok',
      service: 'caas-gateway',
      timestamp: result.timestamp,
      uptime: process.uptime(),
    });
  });

  /**
   * Readiness probe - checks all dependencies
   * Used by Kubernetes to determine if pod can receive traffic
   */
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await healthCheckService.checkHealth();
    
    const statusCode = result.status === 'healthy' ? 200 : 503;
    
    return reply.code(statusCode).send({
      status: result.status,
      service: 'caas-gateway',
      timestamp: result.timestamp,
      dependencies: {
        mongodb: result.checks.mongodb?.status || 'unknown',
        redis: result.checks.redis?.status || 'unknown',
        kafka: result.checks.kafka?.status || 'unknown',
      },
    });
  });

  /**
   * Detailed health check - full diagnostic information
   * Used for debugging and monitoring
   */
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await healthCheckService.checkHealth(true); // Skip cache for detailed check
    
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    
    return reply.code(statusCode).send({
      status: result.status,
      service: 'caas-gateway',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: result.timestamp,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB',
      },
      checks: result.checks,
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  });
}
