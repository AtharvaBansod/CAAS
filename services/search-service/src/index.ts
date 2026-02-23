import { Client } from '@elastic/elasticsearch';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import Fastify from 'fastify';
import Redis from 'ioredis';
import { messagesIndexMapping } from './indices/messages.index.js';
import { conversationsIndexMapping } from './indices/conversations.index.js';
import { usersIndexMapping } from './indices/users.index.js';
import { searchRoutes } from './routes/search.js';
import { KafkaIndexer } from './indexing/kafka-indexer.js';
import { Reindexer } from './indexing/reindexer.js';
import { initializeComplianceClient } from './middleware/compliance.middleware.js';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = parseInt(process.env.PORT || '3006', 10);

async function main() {
  console.log('Starting Search Service...');

  // Initialize compliance client
  const complianceUrl = process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008';
  initializeComplianceClient(complianceUrl);
  console.log('Compliance client initialized');

  // Initialize Elasticsearch client
  const esClient = new Client({
    node: ELASTICSEARCH_URL,
    auth: {
      username: 'elastic',
      password: ELASTICSEARCH_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Test connection
  try {
    await esClient.ping();
    console.log('Connected to Elasticsearch');
  } catch (error) {
    console.error('Failed to connect to Elasticsearch:', error);
    process.exit(1);
  }

  // Initialize indices
  await initializeIndices(esClient);

  // Initialize MongoDB client
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  console.log('Connected to MongoDB');

  // Initialize Redis
  const redis = new Redis(REDIS_URL);
  console.log('Connected to Redis');

  // Initialize Kafka indexer (start in background with retry - don't block server startup)
  const kafkaIndexer = new KafkaIndexer(KAFKA_BROKERS, esClient);
  const startIndexer = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
      try {
        await kafkaIndexer.start();
        console.log('Kafka indexer started');
        return;
      } catch (err) {
        console.warn(`Kafka indexer start attempt ${i + 1}/${retries} failed:`, (err as Error).message);
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
        else console.error('Kafka indexer failed to start after retries - search indexing disabled');
      }
    }
  };
  startIndexer(); // fire and forget

  // Initialize reindexer
  const reindexer = new Reindexer(esClient, mongoClient);

  // Initialize Fastify server
  const fastify = Fastify({ logger: true });

  // Correlation ID middleware (must be first)
  const { correlationMiddleware } = await import('./middleware/correlation.middleware.js');
  fastify.addHook('onRequest', correlationMiddleware);

  // Health check (don't fail if indexer not yet started)
  fastify.get('/health', async () => {
    let metrics: { documentsIndexed?: number; errors?: number } = {};
    try {
      metrics = kafkaIndexer.getMetrics();
    } catch (_) {}
    return {
      status: 'healthy',
      service: 'search-service',
      indexing: metrics,
    };
  });

  // Register search routes
  await fastify.register(searchRoutes, { esClient, redis });

  // Admin reindex endpoint
  fastify.post('/admin/reindex', async (request, reply) => {
    const { tenant_id, type } = request.body as any;

    try {
      if (type === 'messages' || !type) {
        await reindexer.reindexMessages(tenant_id);
      }
      if (type === 'conversations' || !type) {
        await reindexer.reindexConversations(tenant_id);
      }
      if (type === 'users' || !type) {
        await reindexer.reindexUsers(tenant_id);
      }

      return reply.send({
        success: true,
        message: 'Reindexing completed',
        metrics: reindexer.getMetrics(),
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: 'ReindexFailed',
        message: error.message,
      });
    }
  });

  // Metrics endpoint
  fastify.get('/metrics', async () => {
    return {
      indexing: kafkaIndexer.getMetrics(),
      reindexing: reindexer.getMetrics(),
    };
  });

  // Start server
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Search service listening on port ${PORT}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await kafkaIndexer.stop();
    await mongoClient.close();
    redis.disconnect();
    await fastify.close();
    process.exit(0);
  });
}

async function initializeIndices(esClient: Client): Promise<void> {
  const indices = [
    { name: 'messages', mapping: messagesIndexMapping },
    { name: 'conversations', mapping: conversationsIndexMapping },
    { name: 'users', mapping: usersIndexMapping },
  ];

  for (const index of indices) {
    try {
      const exists = await esClient.indices.exists({ index: index.name });
      if (!exists) {
        await esClient.indices.create({
          index: index.name,
          ...index.mapping,
        });
        console.log(`Created index: ${index.name}`);
      } else {
        console.log(`Index already exists: ${index.name}`);
      }
    } catch (error) {
      console.error(`Failed to create index ${index.name}:`, error);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
