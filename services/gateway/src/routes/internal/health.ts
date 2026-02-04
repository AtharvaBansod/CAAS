import { FastifyPluginAsync } from 'fastify';
import { healthCheckService } from '../../services/health-check';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  });

  fastify.get('/ready', async (request, reply) => {
    const health = await healthCheckService.getHealthStatus();
    
    if (health.status === 'error') {
      return reply.status(503).send(health);
    }
    
    return health;
  });

  fastify.get('/health/detailed', async () => {
    const health = await healthCheckService.getHealthStatus();
    return {
      ...health,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  });
};

export default healthRoutes;
