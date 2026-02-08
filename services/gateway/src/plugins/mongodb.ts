/**
 * MongoDB Plugin
 * 
 * Provides MongoDB connection to Fastify
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { MongoClient, Db } from 'mongodb';
import { config } from '../config';

declare module 'fastify' {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
    };
  }
}

const mongoPlugin: FastifyPluginAsync = async (fastify) => {
  const client = new MongoClient(config.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  try {
    await client.connect();
    fastify.log.info('MongoDB connected successfully');

    const db = client.db();

    // Test connection
    await db.admin().ping();
    fastify.log.info('MongoDB ping successful');

    fastify.decorate('mongo', {
      client,
      db,
    });

    // Close connection on app close
    fastify.addHook('onClose', async () => {
      await client.close();
      fastify.log.info('MongoDB connection closed');
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'MongoDB connection failed');
    throw error;
  }
};

export default fp(mongoPlugin, {
  name: 'mongodb',
});
