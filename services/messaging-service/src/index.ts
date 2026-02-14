// Main entry point for the messaging service
import { MongoClient } from 'mongodb';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { ConversationService } from './conversations/conversation.service';
import { ConversationRepository } from './conversations/conversation.repository';
import { ConversationEnricher } from './conversations/conversation.enricher';
import { ConversationAuthorization } from './conversations/conversation.authorization';
import { ModerationRepository } from './conversations/moderation.repository';
import { ModerationService } from './conversations/moderation.service';
import { PinnedMessagesRepository } from './conversations/pinned-messages.repository';
import { PinnedMessagesService } from './conversations/pinned-messages.service';
import { AuditLogRepository } from './conversations/audit-log.repository';
import { AuditLogService } from './conversations/audit-log.service';
import { MessageRepository } from './messages/message.repository';
import { MessageService } from './messages/message.service';
import { TextProcessor } from './messages/processors/text-processor';
import { LinkPreviewService } from './messages/processors/link-preview.service';
import { ReactionRepository } from './messages/reactions/reaction.repository';
import { ReactionService } from './messages/reactions/reaction.service';
import { ForwardService } from './messages/forward/forward.service';
import { ThreadService } from './messages/threads/thread.service';
import { SystemMessageService } from './messages/system-message.service';
import { EditHistoryRepository } from './messages/edit/edit-history.repository';

async function start() {
  // Initialize MongoDB
  const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/caas');
  await mongoClient.connect();
  const db = mongoClient.db();

  // Initialize Kafka
  const kafka = new Kafka({
    clientId: 'messaging-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });
  const producer = kafka.producer();
  await producer.connect();

  // Initialize Redis
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // Initialize conversation repositories and services
  const conversationRepository = new ConversationRepository(db);
  const conversationEnricher = new ConversationEnricher();
  const conversationAuthorization = new ConversationAuthorization();

  const auditLogRepository = new AuditLogRepository(db);
  const auditLogService = new AuditLogService(auditLogRepository);

  const moderationRepository = new ModerationRepository(db);
  const moderationService = new ModerationService(
    moderationRepository,
    conversationRepository,
    conversationAuthorization,
    conversationEnricher,
    producer,
    auditLogService
  );

  const pinnedMessagesRepository = new PinnedMessagesRepository(db);
  const pinnedMessagesService = new PinnedMessagesService(
    pinnedMessagesRepository,
    conversationRepository,
    conversationAuthorization,
    producer,
    auditLogService
  );
  const conversationService = new ConversationService(
    conversationRepository,
    producer,
    conversationEnricher,
    conversationAuthorization
  );

  // Initialize message repositories and services
  const messageRepository = new MessageRepository(db);
  const linkPreviewService = new LinkPreviewService(redis);
  const textProcessor = new TextProcessor(linkPreviewService);
  const messageService = new MessageService(
    messageRepository,
    conversationService,
    producer,
    textProcessor
  );

  const reactionRepository = new ReactionRepository(db);
  const reactionService = new ReactionService(reactionRepository, messageRepository, producer);

  const forwardService = new ForwardService(messageService, messageRepository, conversationService);
  const threadService = new ThreadService(messageService, messageRepository);
  const systemMessageService = new SystemMessageService(messageRepository);
  const editHistoryRepository = new EditHistoryRepository(db);

  console.log('Messaging service started with message support');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await producer.disconnect();
    await mongoClient.close();
    redis.disconnect();
    console.log('Messaging service stopped');
  });
}

start().catch(console.error);
