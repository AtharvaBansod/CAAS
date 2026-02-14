import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { MongoClient } from 'mongodb';
import { S3Client } from '@aws-sdk/client-s3';
import { Kafka, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { loadConfig } from './config/index.js';
import { uploadRoutes } from './routes/upload.js';
import { downloadRoutes } from './routes/download.js';

export async function createServer(): Promise<FastifyInstance> {
  const config = loadConfig();

  const fastify = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    bodyLimit: config.upload.maxFileSizeMB * 1024 * 1024,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
    },
  });

  // MongoDB connection
  const mongoClient = new MongoClient(config.mongodb.uri);
  await mongoClient.connect();
  fastify.log.info('Connected to MongoDB');

  // S3 Client
  const s3Client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
    },
    forcePathStyle: true, // Required for MinIO
  });
  fastify.log.info('S3 client initialized');

  // Redis connection
  const redis = new Redis(config.redis.url);
  fastify.log.info('Connected to Redis');

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
      await redis.ping();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          mongodb: 'connected',
          s3: 'connected',
          redis: 'connected',
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
  const context = {
    mongoClient,
    s3Client,
    redis,
    kafkaProducer,
    config,
  };

  await fastify.register(uploadRoutes, context);
  await fastify.register(downloadRoutes, context);

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    fastify.log.info(`Received ${signal}, closing gracefully`);
    await kafkaProducer.disconnect();
    await mongoClient.close();
    redis.disconnect();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  process.on('SIGINT', () => closeGracefully('SIGINT'));

  return fastify;
}
