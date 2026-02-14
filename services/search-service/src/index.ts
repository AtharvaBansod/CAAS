import { Client } from '@elastic/elasticsearch';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import Fastify from 'fastify';
import { messagesIndexMapping } from './indices/messages.index';
import { conversationsIndexMapping } from './indices/conversations.index';
import { usersIndexMapping } from './indices/users.index';
import { MessageIndexer } from './indexing/message-indexer';
import { ConversationIndexer } from './indexing/conversation-indexer';
import { UserIndexer } from './indexing/user-indexer';
import { IndexingConsumer } from './indexing/indexing-consumer';
import { MessageSearchService } from './search/message-search.service';
import { GlobalSearchService } from './search/global-search.service';
import { SuggestionsService } from './search/suggestions.service';

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ELASTICSEARCH_PASSWORD = process.env.ELASTICSEARCH_PASSWORD || 'changeme';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = parseInt(process.env.PORT || '3006', 10);

async function main() {
  console.log('Starting Search Service...');

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

  // Initialize Kafka
  const kafka = new Kafka({
    clientId: 'search-service',
    brokers: KAFKA_BROKERS,
  });

  // Initialize indexers
  const messageIndexer = new MessageIndexer(esClient);
  const conversationIndexer = new ConversationIndexer(esClient, mongoClient);
  const userIndexer = new UserIndexer(esClient);

  // Initialize search services
  const messageSearchService = new MessageSearchService(esClient);
  const globalSearchService = new GlobalSearchService(esClient);
  const suggestionsService = new SuggestionsService(esClient, mongoClient, REDIS_URL);

  // Start Kafka consumer
  const indexingConsumer = new IndexingConsumer(kafka, messageIndexer);
  await indexingConsumer.start();
  console.log('Kafka consumer started');

  // Initialize Fastify server
  const fastify = Fastify({ logger: true });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'healthy', service: 'search-service' };
  });

  // Start server
  await fastify.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Search service listening on port ${PORT}`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await indexingConsumer.stop();
    await mongoClient.close();
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
