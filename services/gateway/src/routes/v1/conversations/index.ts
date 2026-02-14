import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  createConversationSchema,
  listConversationsSchema,
  getConversationSchema,
  updateConversationSchema,
  deleteConversationSchema,
  conversationIdSchema,
} from './schemas';
import {
  CreateConversationRequest,
  ListConversationsRequest,
  GetConversationRequest,
  UpdateConversationRequest,
  DeleteConversationRequest,
} from './types';
import { ConversationService } from '@messaging-service/conversations/conversation.service';
import { GroupConversationService } from '@messaging-service/conversations/group-conversation.service';
import { InvitationService } from '@messaging-service/conversations/invitation.service';
import { ModerationService } from '@messaging-service/conversations/moderation.service';
import { PinnedMessagesService } from '@messaging-service/conversations/pinned-messages.service';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';
import { AuditLogService } from '@messaging-service/conversations/audit-log.service';
import { ConversationRepository } from '@messaging-service/conversations/conversation.repository';
import { InvitationRepository } from '@messaging-service/conversations/invitation.repository';
import { ModerationRepository } from '@messaging-service/conversations/moderation.repository';
import { PinnedMessagesRepository } from '@messaging-service/conversations/pinned-messages.repository';
import { UserSettingsRepository } from '@messaging-service/conversations/user-settings.repository';
import { AuditLogRepository } from '@messaging-service/conversations/audit-log.repository';
import { ConversationEnricher } from '@messaging-service/conversations/conversation.enricher';
import { ConversationAuthorization } from '@messaging-service/conversations/conversation.authorization';
import { MongoClient } from 'mongodb';
import { Kafka, Producer } from 'kafkajs';
import { z } from 'zod';
import membersRoutes from './members';
import invitesRoutes from './invites';
import adminRoutes from './admin';
import infoRoutes from './info';
import muteRoutes from './mute';
import archiveRoutes from './archive';
import pinRoutes from './pin';
import deleteRoutes from './delete';
import { GroupInfoService } from '@messaging-service/conversations/group-info.service';
import { ConversationCleanupJob } from '@messaging-service/jobs/conversation-cleanup.job';

// Initialize MongoDB, Kafka, and services (should be done once at application startup)
let conversationService: ConversationService;
let groupConversationService: GroupConversationService;
let invitationService: InvitationService;
let moderationService: ModerationService;
let pinnedMessagesService: PinnedMessagesService;
let groupInfoService: GroupInfoService;
let userSettingsService: UserSettingsService;

async function initializeServices() {
  console.log('Initializing messaging services...');
  const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/caas');
  await mongoClient.connect();
  const db = mongoClient.db();

  const kafka = new Kafka({
    clientId: 'gateway-messaging-routes',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });
  const producer = kafka.producer();
  await producer.connect();

  const conversationRepository = new ConversationRepository(db);
  const invitationRepository = new InvitationRepository(db);
  const moderationRepository = new ModerationRepository(db);
  const pinnedMessagesRepository = new PinnedMessagesRepository(db);
  const userSettingsRepository = new UserSettingsRepository(db);
  const auditLogRepository = new AuditLogRepository(db);
  const conversationEnricher = new ConversationEnricher();
  const conversationAuthorization = new ConversationAuthorization();
  const auditLogService = new AuditLogService(auditLogRepository);
  conversationService = new ConversationService(
    conversationRepository,
    producer,
    conversationEnricher,
    conversationAuthorization
  );
  groupConversationService = new GroupConversationService(
    conversationRepository,
    producer,
    conversationAuthorization
  );
  invitationService = new InvitationService(
    invitationRepository,
    conversationRepository,
    conversationAuthorization,
    conversationEnricher,
    producer
  );
  moderationService = new ModerationService(
    moderationRepository,
    conversationRepository,
    conversationAuthorization,
    conversationEnricher,
    producer,
    auditLogService
  );
  pinnedMessagesService = new PinnedMessagesService(
    pinnedMessagesRepository,
    conversationRepository,
    conversationAuthorization,
    producer,
    auditLogService
  );
  groupInfoService = new GroupInfoService();
  userSettingsService = new UserSettingsService(userSettingsRepository);

  const conversationCleanupJob = new ConversationCleanupJob(conversationRepository, userSettingsRepository);
  conversationCleanupJob.start();

  console.log('Messaging services initialized.');
}

export const conversationRoutes = async (fastify: FastifyInstance) => {
  console.log('Registering conversation routes...');
  await initializeServices();

  fastify.addHook('preHandler', fastify.authenticate);

  // Register members routes
  fastify.register(membersRoutes, { prefix: '/', groupConversationService });

  // Register invites routes
  fastify.register(invitesRoutes, { prefix: '/', invitationService });

  // Register admin routes
  fastify.register(adminRoutes, { prefix: '/', moderationService, pinnedMessagesService });

  // Register info routes
  fastify.register(infoRoutes, { prefix: '/', groupInfoService });

  // Register mute routes
  fastify.register(muteRoutes, { prefix: '/', userSettingsService });

  // Register archive routes
  fastify.register(archiveRoutes, { prefix: '/', userSettingsService });

  // Register pin routes
  fastify.register(pinRoutes, { prefix: '/', userSettingsService });

  // Register delete routes
  fastify.register(deleteRoutes, { prefix: '/', userSettingsService });

  // Create conversation
  fastify.post<{ Body: CreateConversationRequest }>('/', {
    schema: {
      body: createConversationSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const { type, participant_ids, name, avatar_url, initial_message_content } = request.body;
        const conversation = await conversationService.createConversation(
          { type, participant_ids, name, avatar_url, initial_message_content },
          request.user.id,
          request.user.tenant_id,
        );
        return reply.status(201).send(conversation);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ message: 'Validation Error', errors: error.errors });
        }
        if (error.message === 'Conversation must have at least one participant.') {
          return reply.status(400).send({ message: error.message });
        }
        console.error('Error creating conversation:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
      }
    },
  });

  // List conversations
  fastify.get('/', {
    schema: {
      querystring: listConversationsSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const { limit, offset, before, after } = request.query;
        const result = await conversationService.listConversations(
          request.user.id,
          request.user.tenant_id,
          {
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
            before: before ? new Date(before) : undefined,
            after: after ? new Date(after) : undefined,
          }
        );
        return result;
      } catch (error: any) {
        console.error('Error listing conversations:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
      }
    },
  });

  // Get conversation
  fastify.get('/:id', {
    schema: {
      params: getConversationSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        const conversation = await conversationService.getConversation(
          id,
          request.user.id,
          request.user.tenant_id,
        );
        return conversation;
      } catch (error: any) {
        if (error.message === 'Conversation not found.') {
          return reply.status(404).send({ message: error.message });
        }
        if (error.message === 'Unauthorized to access this conversation.') {
          return reply.status(403).send({ message: error.message });
        }
        console.error('Error getting conversation:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
      }
    },
  });

  // Update conversation
  fastify.put('/:id', {
    schema: {
      params: conversationIdSchema,
      body: updateConversationSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        const updatedConversation = await conversationService.updateConversation(
          id,
          request.user.id,
          request.user.tenant_id,
          request.body,
        );
        return updatedConversation;
      } catch (error: any) {
        if (error.message === 'Conversation not found.') {
          return reply.status(404).send({ message: error.message });
        }
        if (error.message === 'Unauthorized to update this conversation.') {
          return reply.status(403).send({ message: error.message });
        }
        console.error('Error updating conversation:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
      }
    },
  });

  // Delete/leave conversation
  fastify.delete('/:id', {
    schema: {
      params: deleteConversationSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const { id } = request.params;
        await conversationService.deleteConversation(
          id,
          request.user.id,
          request.user.tenant_id,
        );
        return reply.status(204).send();
      } catch (error: any) {
        if (error.message === 'Conversation not found.') {
          return reply.status(404).send({ message: error.message });
        }
        if (error.message.startsWith('Unauthorized')) {
          return reply.status(403).send({ message: error.message });
        }
        console.error('Error deleting conversation:', error);
        return reply.status(500).send({ message: 'Internal Server Error' });
      }
    },
  });
};
