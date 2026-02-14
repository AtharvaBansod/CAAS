import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { MongoClient } from 'mongodb';
import { Kafka, Producer } from 'kafkajs';
import { loadConfig, Config } from './config/index.js';
import { messageRoutes } from './routes/messages.js';
import { conversationRoutes } from './routes/conversations.js';

export async function createServer(): Promise<FastifyInstance> {
  const config = loadConfig();

  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
  });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Register CORS
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  // MongoDB connection
  const mongoClient = new MongoClient(config.mongodb.uri);
  await mongoClient.connect();
  fastify.log.info('Connected to MongoDB');

  // Kafka producer
  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
  });

  const kafkaProducer = kafka.producer();
  await kafkaProducer.connect();
  fastify.log.info('Connected to Kafka');

  // Health check endpoint
  fastify.get('/health', async () => {
    try {
      await mongoClient.db().admin().ping();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          mongodb: 'connected',
          kafka: 'connected',
        },
      };
    } catch (error) {
      fastify.log.error({ error }, 'Health check failed');
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Register routes
  await fastify.register(messageRoutes, { mongoClient, kafkaProducer });
  await fastify.register(conversationRoutes, { mongoClient, kafkaProducer });

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    fastify.log.info(`Received ${signal}, closing gracefully`);
    await kafkaProducer.disconnect();
    await mongoClient.close();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  process.on('SIGINT', () => closeGracefully('SIGINT'));

  return fastify;
}
