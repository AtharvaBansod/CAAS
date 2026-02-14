import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  createConversationSchema,
  listConversationsSchema,
  getConversationSchema,
  updateConversationSchema,
  deleteConversationSchema,
  conversationIdSchema,
} from './schemas';
import { getMessagingClient } from '../../../services/messaging-client.js';

export const conversationRoutes = async (fastify: FastifyInstance) => {
  console.log('Registering conversation routes...');
  const messagingClient = getMessagingClient();

  fastify.addHook('preHandler', fastify.authenticate);

  // Create conversation
  fastify.post('/', {
    schema: {
      body: createConversationSchema,
    },
    handler: async (request: any, reply: any) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '') || '';
        const result = await messagingClient.createConversation(token, request.body);
        return reply.status(201).send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to create conversation');
        return reply.status(error.status || 500).send({
          error: 'Failed to create conversation',
          message: error.message,
        });
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
        const token = request.headers.authorization?.replace('Bearer ', '') || '';
        const result = await messagingClient.listConversations(token, request.query);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to list conversations');
        return reply.status(error.status || 500).send({
          error: 'Failed to list conversations',
          message: error.message,
        });
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
        const token = request.headers.authorization?.replace('Bearer ', '') || '';
        const result = await messagingClient.getConversation(token, id);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get conversation');
        return reply.status(error.status || 500).send({
          error: 'Failed to get conversation',
          message: error.message,
        });
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
        const token = request.headers.authorization?.replace('Bearer ', '') || '';
        const result = await messagingClient.updateConversation(token, id, request.body);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to update conversation');
        return reply.status(error.status || 500).send({
          error: 'Failed to update conversation',
          message: error.message,
        });
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
        const token = request.headers.authorization?.replace('Bearer ', '') || '';
        await messagingClient.deleteConversation(token, id);
        return reply.status(204).send();
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to delete conversation');
        return reply.status(error.status || 500).send({
          error: 'Failed to delete conversation',
          message: error.message,
        });
      }
    },
  });
};
