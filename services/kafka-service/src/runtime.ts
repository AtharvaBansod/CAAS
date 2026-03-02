import http from 'http';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import { MessagePersistenceConsumer } from './consumers/message-persistence-consumer';
import { ConversationPersistenceConsumer } from './consumers/conversation-persistence.consumer';
import { MessageRepository } from './persistence/message-repository';
import { ConversationCache } from './persistence/conversation-cache';
import { PersistenceNotifier } from './persistence/persistence-notifier';
import { RealtimeDlqPublisher } from './runtime/realtime-dlq';
import { RetryConsumer } from './consumers/retry-consumer';

const PORT = Number(process.env['PORT'] || '3010');
const MONGODB_URI =
  process.env['MONGODB_URI'] ||
  'mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017/caas_platform?authSource=admin&replicaSet=caas-rs';
const REDIS_URL =
  process.env['REDIS_URL'] || 'redis://:caas_redis_2026@redis-shared:6379/0';
const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] || 'kafka-1:29092,kafka-2:29092,kafka-3:29092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);
const KAFKA_CLIENT_ID = process.env['KAFKA_CLIENT_ID'] || 'kafka-service-runtime';
const MESSAGE_TOPIC = process.env['MESSAGE_PERSISTENCE_TOPIC'] || 'chat.messages';
const MESSAGE_GROUP_ID = process.env['MESSAGE_PERSISTENCE_GROUP_ID'] || 'message-persistence';
const MESSAGE_BATCH_SIZE = Number(process.env['MESSAGE_PERSISTENCE_BATCH_SIZE'] || '25');
const MESSAGE_FLUSH_INTERVAL_MS = Number(process.env['MESSAGE_PERSISTENCE_FLUSH_INTERVAL_MS'] || '2000');
const MESSAGE_ALLOWED_EVENT_TYPES = (process.env['MESSAGE_PERSISTENCE_ALLOWED_EVENT_TYPES'] || 'message.created')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const MESSAGE_DLQ_TOPIC = process.env['MESSAGE_PERSISTENCE_DLQ_TOPIC'] || 'internal.dlq';
const CONVERSATION_TOPIC = process.env['CONVERSATION_PERSISTENCE_TOPIC'] || 'conversation-events';
const CONVERSATION_GROUP_ID =
  process.env['CONVERSATION_PERSISTENCE_GROUP_ID'] || 'conversation-persistence';
const NOTIFIER_TOPIC = process.env['PERSISTENCE_NOTIFIER_TOPIC'] || 'chat.persistence.events';

async function main(): Promise<void> {
  const mongoClient = new MongoClient(MONGODB_URI);
  const redis = new Redis(REDIS_URL);
  const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
  });
  const messageRepository = new MessageRepository(mongoClient);
  const conversationCache = new ConversationCache(redis);
  const persistenceNotifier = new PersistenceNotifier(kafka, NOTIFIER_TOPIC);
  const dlqPublisher = new RealtimeDlqPublisher(kafka, MESSAGE_DLQ_TOPIC);

  let ready = false;

  const messageConsumer = new MessagePersistenceConsumer({
    kafka,
    groupId: MESSAGE_GROUP_ID,
    topic: MESSAGE_TOPIC,
    batchSize: MESSAGE_BATCH_SIZE,
    flushIntervalMs: MESSAGE_FLUSH_INTERVAL_MS,
    allowedEventTypes: MESSAGE_ALLOWED_EVENT_TYPES,
    messageRepository,
    conversationCache,
    persistenceNotifier,
    dlqPublisher,
  });

  const conversationConsumer = new ConversationPersistenceConsumer({
    kafka,
    groupId: CONVERSATION_GROUP_ID,
    topic: CONVERSATION_TOPIC,
    mongoClient,
    redis,
  });

  const retryConsumer = new RetryConsumer({
    brokers: KAFKA_BROKERS,
    clientId: `${KAFKA_CLIENT_ID}-retry`,
  });

  const server = http.createServer((request, response) => {
    if (request.url === '/health') {
      const healthy =
        ready &&
        messageConsumer.isRunning() &&
        conversationConsumer.isRunning() &&
        persistenceNotifier.isConnected() &&
        dlqPublisher.isConnected();
      response.writeHead(healthy ? 200 : 503, {
        'content-type': 'application/json',
      });
      response.end(
        JSON.stringify({
          status: healthy ? 'healthy' : 'degraded',
          service: 'kafka-service',
          consumers: {
            message_persistence: messageConsumer.isRunning(),
            conversation_persistence: conversationConsumer.isRunning(),
          },
          notifier_connected: persistenceNotifier.isConnected(),
          dlq_connected: dlqPublisher.isConnected(),
          metrics: messageConsumer.getMetrics(),
        })
      );
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'NotFound' }));
  });

  const shutdown = async (signal: string) => {
    ready = false;
    console.log(`[KafkaServiceRuntime] Received ${signal}, shutting down`);
    server.close();
    await Promise.allSettled([
      messageConsumer.stop(),
      conversationConsumer.stop(),
      retryConsumer.stop(),
      persistenceNotifier.disconnect(),
      dlqPublisher.disconnect(),
    ]);
    await Promise.allSettled([mongoClient.close(), redis.quit()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  await mongoClient.connect();
  await ensureIndexes(mongoClient);
  await persistenceNotifier.connect();
  await dlqPublisher.connect();
  await Promise.all([messageConsumer.start(), conversationConsumer.start(), retryConsumer.start()]);

  await new Promise<void>((resolve) => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[KafkaServiceRuntime] Listening on port ${PORT}`);
      ready = true;
      resolve();
    });
  });
}

async function ensureIndexes(mongoClient: MongoClient): Promise<void> {
  const db = mongoClient.db('caas_platform');
  await db.collection('messages').createIndex(
    { tenant_id: 1, message_id: 1 },
    { unique: true, name: 'uniq_tenant_message_id' }
  );
  await db.collection('messages').createIndex(
    { tenant_id: 1, conversation_id: 1, created_at: -1 },
    { name: 'idx_messages_conversation_created_at' }
  );
}

main().catch((error) => {
  console.error('[KafkaServiceRuntime] Fatal error:', error);
  process.exit(1);
});
