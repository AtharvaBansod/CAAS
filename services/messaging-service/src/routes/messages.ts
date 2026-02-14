import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Kafka, Producer } from 'kafkajs';
import { MongoClient, ObjectId } from 'mongodb';
import {
  sendMessageSchema,
  editMessageSchema,
  addReactionSchema,
  listMessagesQuerySchema,
  SendMessageInput,
  EditMessageInput,
  AddReactionInput,
  ListMessagesQuery,
} from './schemas.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

interface MessageRouteContext {
  mongoClient: MongoClient;
  kafkaProducer: Producer;
}

export async function messageRoutes(
  fastify: FastifyInstance,
  context: MessageRouteContext
): Promise<void> {
  const { mongoClient, kafkaProducer } = context;

  // Rate limiter for message sending
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  function checkRateLimit(userId: string, limit: number): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || userLimit.resetAt < now) {
      rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (userLimit.count >= limit) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // Send message
  fastify.post<{ Body: SendMessageInput }>(
    '/messages',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: sendMessageSchema,
      },
    },
    async (request: FastifyRequest<{ Body: SendMessageInput }>, reply: FastifyReply) => {
      const { conversation_id, content, type, metadata, reply_to } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      // Rate limiting
      if (!checkRateLimit(userId, 60)) {
        return reply.code(429).send({
          error: 'TooManyRequests',
          message: 'Rate limit exceeded',
        });
      }

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        // Verify conversation exists and user is a member
        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(conversation_id),
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const isMember = conversation.members?.some(
          (m: any) => m.user_id === userId
        );

        if (!isMember) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        // Create message
        const message = {
          conversation_id: new ObjectId(conversation_id),
          sender_id: userId,
          content,
          type,
          metadata: metadata || {},
          reply_to: reply_to ? new ObjectId(reply_to) : undefined,
          reactions: [],
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        };

        const result = await messagesCollection.insertOne(message);

        // Update conversation last_message
        await conversationsCollection.updateOne(
          { _id: new ObjectId(conversation_id) },
          {
            $set: {
              last_message_id: result.insertedId,
              updated_at: new Date(),
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'chat.messages',
          messages: [
            {
              key: conversation_id,
              value: JSON.stringify({
                event: 'message.created',
                tenant_id: tenantId,
                conversation_id,
                message_id: result.insertedId.toString(),
                sender_id: userId,
                content,
                type,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(201).send({
          id: result.insertedId.toString(),
          conversation_id,
          sender_id: userId,
          content,
          type,
          metadata,
          reply_to,
          reactions: [],
          created_at: message.created_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to send message');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to send message',
        });
      }
    }
  );

  // List messages in conversation
  fastify.get<{
    Params: { id: string };
    Querystring: ListMessagesQuery;
  }>(
    '/conversations/:id/messages',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        querystring: listMessagesQuerySchema,
      },
    },
    async (request, reply) => {
      const { id: conversationId } = request.params;
      const { limit, cursor, before, after } = request.query;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        // Verify conversation access
        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(conversationId),
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const isMember = conversation.members?.some(
          (m: any) => m.user_id === userId
        );

        if (!isMember) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        // Build query
        const query: any = {
          conversation_id: new ObjectId(conversationId),
          deleted_at: null,
        };

        if (cursor) {
          query._id = { $lt: new ObjectId(cursor) };
        }

        if (before) {
          query.created_at = { $lt: new Date(before) };
        }

        if (after) {
          query.created_at = { $gt: new Date(after) };
        }

        const messages = await messagesCollection
          .find(query)
          .sort({ _id: -1 })
          .limit(limit)
          .toArray();

        const formattedMessages = messages.map((msg) => ({
          id: msg._id.toString(),
          conversation_id: conversationId,
          sender_id: msg.sender_id,
          content: msg.content,
          type: msg.type,
          metadata: msg.metadata,
          reply_to: msg.reply_to?.toString(),
          reactions: msg.reactions || [],
          created_at: msg.created_at.toISOString(),
          updated_at: msg.updated_at?.toISOString(),
        }));

        const nextCursor =
          messages.length === limit
            ? messages[messages.length - 1]._id.toString()
            : null;

        return reply.send({
          messages: formattedMessages,
          cursor: nextCursor,
          has_more: messages.length === limit,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to list messages');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to list messages',
        });
      }
    }
  );

  // Get single message
  fastify.get<{ Params: { id: string } }>(
    '/messages/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const message = await messagesCollection.findOne({
          _id: new ObjectId(id),
          deleted_at: null,
        });

        if (!message) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Message not found',
          });
        }

        // Verify conversation access
        const conversation = await conversationsCollection.findOne({
          _id: message.conversation_id,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const isMember = conversation.members?.some(
          (m: any) => m.user_id === userId
        );

        if (!isMember) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        return reply.send({
          id: message._id.toString(),
          conversation_id: message.conversation_id.toString(),
          sender_id: message.sender_id,
          content: message.content,
          type: message.type,
          metadata: message.metadata,
          reply_to: message.reply_to?.toString(),
          reactions: message.reactions || [],
          created_at: message.created_at.toISOString(),
          updated_at: message.updated_at?.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get message');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to get message',
        });
      }
    }
  );

  // Edit message
  fastify.put<{
    Params: { id: string };
    Body: EditMessageInput;
  }>(
    '/messages/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: editMessageSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { content } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        const message = await messagesCollection.findOne({
          _id: new ObjectId(id),
          deleted_at: null,
        });

        if (!message) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Message not found',
          });
        }

        if (message.sender_id !== userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Can only edit your own messages',
          });
        }

        await messagesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              content,
              updated_at: new Date(),
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'chat.messages',
          messages: [
            {
              key: message.conversation_id.toString(),
              value: JSON.stringify({
                event: 'message.updated',
                tenant_id: tenantId,
                message_id: id,
                conversation_id: message.conversation_id.toString(),
                sender_id: userId,
                content,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.send({
          id,
          content,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to edit message');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to edit message',
        });
      }
    }
  );

  // Delete message
  fastify.delete<{ Params: { id: string } }>(
    '/messages/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        const message = await messagesCollection.findOne({
          _id: new ObjectId(id),
          deleted_at: null,
        });

        if (!message) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Message not found',
          });
        }

        if (message.sender_id !== userId) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Can only delete your own messages',
          });
        }

        await messagesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              deleted_at: new Date(),
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'chat.messages',
          messages: [
            {
              key: message.conversation_id.toString(),
              value: JSON.stringify({
                event: 'message.deleted',
                tenant_id: tenantId,
                message_id: id,
                conversation_id: message.conversation_id.toString(),
                sender_id: userId,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to delete message');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to delete message',
        });
      }
    }
  );

  // Add reaction
  fastify.post<{
    Params: { id: string };
    Body: AddReactionInput;
  }>(
    '/messages/:id/reactions',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: addReactionSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { reaction } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        const message = await messagesCollection.findOne({
          _id: new ObjectId(id),
          deleted_at: null,
        });

        if (!message) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Message not found',
          });
        }

        await messagesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: {
              reactions: {
                reaction,
                user_id: userId,
                created_at: new Date(),
              },
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'chat.messages',
          messages: [
            {
              key: message.conversation_id.toString(),
              value: JSON.stringify({
                event: 'reaction.added',
                tenant_id: tenantId,
                message_id: id,
                conversation_id: message.conversation_id.toString(),
                user_id: userId,
                reaction,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(201).send({
          reaction,
          user_id: userId,
          created_at: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to add reaction');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to add reaction',
        });
      }
    }
  );

  // Remove reaction
  fastify.delete<{
    Params: { id: string; reaction: string };
  }>(
    '/messages/:id/reactions/:reaction',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id, reaction } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        const message = await messagesCollection.findOne({
          _id: new ObjectId(id),
          deleted_at: null,
        });

        if (!message) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Message not found',
          });
        }

        await messagesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $pull: {
              reactions: {
                reaction,
                user_id: userId,
              },
            },
          } as any
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'chat.messages',
          messages: [
            {
              key: message.conversation_id.toString(),
              value: JSON.stringify({
                event: 'reaction.removed',
                tenant_id: tenantId,
                message_id: id,
                conversation_id: message.conversation_id.toString(),
                user_id: userId,
                reaction,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to remove reaction');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to remove reaction',
        });
      }
    }
  );
}
