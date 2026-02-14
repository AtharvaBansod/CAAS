import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';
import { Redis } from 'ioredis';
import { MediaRepository } from './media/media.repository';
import { UploadService } from './upload/upload.service';
import { MediaValidator } from './validation/media-validator';
import { SignedUrlService } from './delivery/signed-url.service';
import { QuotaService } from './quotas/quota.service';
import { MediaCleanupService } from './cleanup/cleanup.service';
import { ProcessingConsumer } from './processing/processing-consumer';

async function main() {
  console.log('Starting Media Service...');

  // MongoDB connection
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/caas_platform';
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const db = mongoClient.db();
  console.log('Connected to MongoDB');

  // Redis connection
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);
  console.log('Connected to Redis');

  // Kafka connection
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const kafka = new Kafka({
    clientId: 'media-service',
    brokers: kafkaBrokers,
  });
  console.log('Kafka client initialized');

  // Initialize repositories and services
  const mediaRepo = new MediaRepository(db);
  const validator = new MediaValidator();
  const uploadService = new UploadService(mediaRepo, validator, kafka);
  const signedUrlService = new SignedUrlService(redis);
  const quotaService = new QuotaService(mediaRepo, redis);
  const cleanupService = new MediaCleanupService(mediaRepo);

  // Start processing consumer
  const processingConsumer = new ProcessingConsumer(kafka, mediaRepo);
  await processingConsumer.start();
  console.log('Processing consumer started');

  // Schedule cleanup jobs
  setInterval(async () => {
    console.log('Running orphaned media cleanup...');
    const result = await cleanupService.cleanupOrphanedMedia();
    console.log(`Cleaned up ${result.deleted} orphaned media files`);
  }, 60 * 60 * 1000); // Every hour

  setInterval(async () => {
    console.log('Running expired media cleanup...');
    const result = await cleanupService.cleanupExpiredMedia();
    console.log(`Cleaned up ${result.deleted} expired media files`);
  }, 24 * 60 * 60 * 1000); // Every 24 hours

  console.log('Media service started successfully');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await processingConsumer.shutdown();
    await uploadService.shutdown();
    await mongoClient.close();
    await redis.quit();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start media service:', error);
  process.exit(1);
});
