import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import Redis from 'ioredis';

// Helper to create a standalone Redis client (for rate-limit, etc.)
export const createRedisClient = () => {
  return new Redis(config.REDIS_URL);
};

const redisPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyRedis, {
    url: config.REDIS_URL,
    closeClient: true, // Close Redis client when Fastify closes
  });
};

export default fp(redisPlugin);
