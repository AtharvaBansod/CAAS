import { FastifyInstance } from 'fastify';
import { mongoConnection } from '../storage/mongodb-connection';
import { redisConnection } from '../storage/redis-connection';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async (request, reply) => {
    const mongoHealthy = await mongoConnection.ping();
    const redisHealthy = await redisConnection.ping();

    const status = mongoHealthy && redisHealthy ? 'healthy' : 'degraded';

    return reply.code(200).send({
      status,
      service: 'compliance-service',
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: mongoHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
    });
  });

  // Readiness check
  fastify.get('/health/ready', async (request, reply) => {
    const mongoHealthy = await mongoConnection.ping();
    const redisHealthy = await redisConnection.ping();

    if (mongoHealthy && redisHealthy) {
      return reply.code(200).send({
        status: 'ready',
        service: 'compliance-service',
        timestamp: new Date().toISOString(),
      });
    }

    return reply.code(503).send({
      status: 'not_ready',
      service: 'compliance-service',
      timestamp: new Date().toISOString(),
    });
  });
}
