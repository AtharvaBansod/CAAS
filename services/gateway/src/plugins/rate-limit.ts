import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config';
import { createRedisClient } from './redis';

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  const redis = createRedisClient();

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: redis,
    nameSpace: 'rate-limit:',
    skipOnError: true, // Don't block if Redis is down
    keyGenerator: (req) => {
      return (req.headers['x-forwarded-for'] as string) || req.ip;
    },
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${context.after} seconds`,
        date: Date.now(),
        expiresIn: context.ttl,
      };
    },
  });
};

export default fp(rateLimitPlugin);
