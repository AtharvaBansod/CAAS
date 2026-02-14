// Message routes for the gateway - Proxy to messaging service
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { sendMessageSchema, messageQuerySchema, editMessageSchema, forwardMessageSchema } from './schemas';
import { getMessagingClient } from '../../../services/messaging-client.js';

export async function messageRoutes(fastify: FastifyInstance) {
  const messagingClient = getMessagingClient();

  // Send message
  fastify.post('/', {
    schema: {
      description: 'Send a message to a conversation',
      tags: ['messages'],
      body: sendMessageSchema,
    },
    handler: async (request: FastifyRequest<{
      Body: z.infer<typeof sendMessageSchema>
    }>, reply: FastifyReply) => {
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await messagingClient.sendMessage(token, request.body);
        return reply.status(201).send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to send message');
        return reply.status(error.status || 500).send({
          error: 'Failed to send message',
          message: error.message,
        });
      }
    },
  });

  // Get messages in conversation
  fastify.get('/conversations/:conversationId', {
    schema: {
      description: 'Get messages in a conversation',
      tags: ['messages'],
      params: z.object({
        conversationId: z.string(),
      }),
      querystring: messageQuerySchema,
    },
    handler: async (request: FastifyRequest<{
      Params: { conversationId: string };
      Querystring: z.infer<typeof messageQuerySchema>;
    }>, reply: FastifyReply) => {
      const { conversationId } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await messagingClient.listMessages(token, conversationId, request.query);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to list messages');
        return reply.status(error.status || 500).send({
          error: 'Failed to list messages',
          message: error.message,
        });
      }
    },
  });

  // Get single message
  fastify.get('/:id', {
    schema: {
      description: 'Get a single message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await messagingClient.getMessage(token, id);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to get message');
        return reply.status(error.status || 500).send({
          error: 'Failed to get message',
          message: error.message,
        });
      }
    },
  });

  // Edit message
  fastify.put('/:id', {
    schema: {
      description: 'Edit a message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
      body: editMessageSchema,
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: z.infer<typeof editMessageSchema>;
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await messagingClient.editMessage(token, id, request.body);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to edit message');
        return reply.status(error.status || 500).send({
          error: 'Failed to edit message',
          message: error.message,
        });
      }
    },
  });

  // Delete message
  fastify.delete('/:id', {
    schema: {
      description: 'Delete a message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        await messagingClient.deleteMessage(token, id);
        return reply.status(204).send();
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to delete message');
        return reply.status(error.status || 500).send({
          error: 'Failed to delete message',
          message: error.message,
        });
      }
    },
  });

  // Add reaction
  fastify.post('/:id/reactions', {
    schema: {
      description: 'Add reaction to message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        reaction: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: { reaction: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        const result = await messagingClient.addReaction(token, id, request.body);
        return reply.status(201).send(result);
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to add reaction');
        return reply.status(error.status || 500).send({
          error: 'Failed to add reaction',
          message: error.message,
        });
      }
    },
  });

  // Remove reaction
  fastify.delete('/:id/reactions/:reaction', {
    schema: {
      description: 'Remove reaction from message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
        reaction: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string; reaction: string };
    }>, reply: FastifyReply) => {
      const { id, reaction } = request.params;
      const token = request.headers.authorization?.replace('Bearer ', '') || '';

      try {
        await messagingClient.removeReaction(token, id, reaction);
        return reply.status(204).send();
      } catch (error: any) {
        fastify.log.error({ error }, 'Failed to remove reaction');
        return reply.status(error.status || 500).send({
          error: 'Failed to remove reaction',
          message: error.message,
        });
      }
    },
  });

  // Get reactions
  fastify.get('/:id/reactions', {
    schema: {
      description: 'Get reactions on message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call reaction service
      return reply.send({});
    },
  });

  // Create reply
  fastify.post('/:id/replies', {
    schema: {
      description: 'Create reply to message',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
      body: z.object({
        content: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { content } = request.body;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call thread service
      return reply.status(201).send({});
    },
  });

  // Get thread replies
  fastify.get('/:id/replies', {
    schema: {
      description: 'Get thread replies',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call thread service
      return reply.send([]);
    },
  });

  // Forward message
  fastify.post('/:id/forward', {
    schema: {
      description: 'Forward message to conversations',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
      body: forwardMessageSchema,
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: z.infer<typeof forwardMessageSchema>;
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { conversation_ids } = request.body;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call forward service
      return reply.status(201).send([]);
    },
  });

  // Get edit history
  fastify.get('/:id/history', {
    schema: {
      description: 'Get edit history',
      tags: ['messages'],
      params: z.object({
        id: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call edit history service
      return reply.send([]);
    },
  });
}
