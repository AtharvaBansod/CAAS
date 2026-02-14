/**
 * Authorization Plugin
 * 
 * Initializes authorization enforcer with MongoDB and Redis clients
 */

import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { authzEnforcer } from '../middleware/authorization';

async function authorizationPlugin(fastify: FastifyInstance) {
  // Wait for MongoDB and Redis to be available
  if (!fastify.mongo || !fastify.redis) {
    fastify.log.warn('MongoDB or Redis not available, authorization will use fallback mode');
    return;
  }

  try {
    // Set MongoDB client for membership checks
    authzEnforcer.setMongoClient(fastify.mongo.client);
    
    // Create a standalone Redis client for the membership cache
    // (we need ioredis instance, not the fastify-redis one)
    const { createRedisClient } = await import('./redis');
    const redisClient = createRedisClient();
    
    authzEnforcer.setRedisClient(redisClient);
    
    fastify.log.info('Authorization enforcer initialized with MongoDB and Redis');

    // Close Redis connection on app close
    fastify.addHook('onClose', async () => {
      await redisClient.quit();
      fastify.log.info('Authorization Redis connection closed');
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to initialize authorization enforcer');
    // Don't throw - authorization will work in fallback mode
  }
}

export default fp(authorizationPlugin, {
  name: 'authorization',
});
