// Message routes for the gateway
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { sendMessageSchema, messageQuerySchema, editMessageSchema, forwardMessageSchema } from './schemas';

export async function messageRoutes(fastify: FastifyInstance) {
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
      const { conversation_id, type, content, reply_to, forwarded_from } = request.body;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call message service
      // For now, return mock response
      const message = {
        id: 'msg_' + Date.now(),
        conversation_id,
        tenant_id: tenantId,
        sender_id: userId,
        type,
        content,
        reply_to,
        forwarded_from,
        status: 'sent',
        created_at: new Date(),
      };

      return reply.status(201).send(message);
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
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call message service
      return reply.send({
        messages: [],
        cursor: {},
        has_more: false,
      });
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
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call message service
      return reply.status(404).send({ error: 'Message not found' });
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
      const { content } = request.body;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call message service
      return reply.status(404).send({ error: 'Message not found' });
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
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call message service
      return reply.status(204).send();
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
        emoji: z.string(),
      }),
    },
    handler: async (request: FastifyRequest<{
      Params: { id: string };
      Body: { emoji: string };
    }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { emoji } = request.body;
      const userId = (request as any).user?.id;
      const tenantId = (request as any).user?.tenant_id;

      if (!userId || !tenantId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // TODO: Call reaction service
      return reply.status(201).send({ success: true });
    },
  });

  // Remove reaction
  fastify.delete('/:id/reactions', {
    schema: {
      description: 'Remove reaction from message',
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
      return reply.status(204).send();
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
