import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Producer } from 'kafkajs';
import { MongoClient, ObjectId } from 'mongodb';
import {
  createConversationSchema,
  updateConversationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  listConversationsQuerySchema,
  CreateConversationInput,
  UpdateConversationInput,
  AddMemberInput,
  UpdateMemberRoleInput,
  ListConversationsQuery,
} from './schemas.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

interface ConversationRouteContext {
  mongoClient: MongoClient;
  kafkaProducer: Producer;
}

export async function conversationRoutes(
  fastify: FastifyInstance,
  context: ConversationRouteContext
): Promise<void> {
  const { mongoClient, kafkaProducer } = context;

  // Create conversation
  fastify.post<{ Body: CreateConversationInput }>(
    '/conversations',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: createConversationSchema,
      },
    },
    async (request: FastifyRequest<{ Body: CreateConversationInput }>, reply: FastifyReply) => {
      const { name, type, member_ids, metadata } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        // Ensure creator is in members
        const uniqueMemberIds = Array.from(new Set([userId, ...member_ids]));

        const members = uniqueMemberIds.map((memberId) => ({
          user_id: memberId,
          role: memberId === userId ? 'owner' : 'member',
          joined_at: new Date(),
        }));

        const conversation = {
          tenant_id: tenantId,
          name: name || null,
          type,
          members,
          metadata: metadata || {},
          last_message_id: null,
          unread_counts: {},
          created_at: new Date(),
          updated_at: new Date(),
          archived_at: null,
        };

        const result = await conversationsCollection.insertOne(conversation);

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: result.insertedId.toString(),
              value: JSON.stringify({
                event: 'conversation.created',
                tenant_id: tenantId,
                conversation_id: result.insertedId.toString(),
                creator_id: userId,
                type,
                member_ids: uniqueMemberIds,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(201).send({
          id: result.insertedId.toString(),
          tenant_id: tenantId,
          name,
          type,
          members,
          metadata,
          created_at: conversation.created_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to create conversation');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to create conversation',
        });
      }
    }
  );

  // List conversations
  fastify.get<{ Querystring: ListConversationsQuery }>(
    '/conversations',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        querystring: listConversationsQuerySchema,
      },
    },
    async (request, reply) => {
      const { limit, cursor, type, archived } = request.query;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);
        const messagesCollection = db.collection(`tenant_${tenantId}_messages`);

        // Build query
        const query: any = {
          'members.user_id': userId,
        };

        if (type) {
          query.type = type;
        }

        if (archived !== undefined) {
          query.archived_at = archived ? { $ne: null } : null;
        } else {
          query.archived_at = null;
        }

        if (cursor) {
          query._id = { $lt: new ObjectId(cursor) };
        }

        const conversations = await conversationsCollection
          .find(query)
          .sort({ updated_at: -1 })
          .limit(limit)
          .toArray();

        // Fetch last messages
        const conversationsWithMessages = await Promise.all(
          conversations.map(async (conv) => {
            let lastMessage = null;
            if (conv.last_message_id) {
              const msg = await messagesCollection.findOne({
                _id: conv.last_message_id,
              });
              if (msg) {
                lastMessage = {
                  id: msg._id.toString(),
                  sender_id: msg.sender_id,
                  content: msg.content,
                  type: msg.type,
                  created_at: msg.created_at.toISOString(),
                };
              }
            }

            const unreadCount = conv.unread_counts?.[userId] || 0;

            return {
              id: conv._id.toString(),
              tenant_id: conv.tenant_id,
              name: conv.name,
              type: conv.type,
              members: conv.members,
              metadata: conv.metadata,
              unread_count: unreadCount,
              last_message: lastMessage,
              created_at: conv.created_at.toISOString(),
              updated_at: conv.updated_at.toISOString(),
              archived_at: conv.archived_at?.toISOString(),
            };
          })
        );

        const nextCursor =
          conversations.length === limit
            ? conversations[conversations.length - 1]._id.toString()
            : null;

        return reply.send({
          conversations: conversationsWithMessages,
          cursor: nextCursor,
          has_more: conversations.length === limit,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to list conversations');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to list conversations',
        });
      }
    }
  );

  // Get conversation
  fastify.get<{ Params: { id: string } }>(
    '/conversations/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
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
          id: conversation._id.toString(),
          tenant_id: conversation.tenant_id,
          name: conversation.name,
          type: conversation.type,
          members: conversation.members,
          metadata: conversation.metadata,
          unread_count: conversation.unread_counts?.[userId] || 0,
          created_at: conversation.created_at.toISOString(),
          updated_at: conversation.updated_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get conversation');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to get conversation',
        });
      }
    }
  );

  // Update conversation
  fastify.put<{
    Params: { id: string };
    Body: UpdateConversationInput;
  }>(
    '/conversations/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: updateConversationSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, metadata } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const member = conversation.members?.find(
          (m: any) => m.user_id === userId
        );

        if (!member) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        if (member.role !== 'admin' && member.role !== 'owner') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only admins and owners can update conversation',
          });
        }

        const updateFields: any = {
          updated_at: new Date(),
        };

        if (name !== undefined) {
          updateFields.name = name;
        }

        if (metadata !== undefined) {
          updateFields.metadata = metadata;
        }

        await conversationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'conversation.updated',
                tenant_id: tenantId,
                conversation_id: id,
                updated_by: userId,
                changes: { name, metadata },
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.send({
          id,
          name,
          metadata,
          updated_at: updateFields.updated_at.toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to update conversation');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to update conversation',
        });
      }
    }
  );

  // Delete/Archive conversation
  fastify.delete<{ Params: { id: string } }>(
    '/conversations/:id',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const member = conversation.members?.find(
          (m: any) => m.user_id === userId
        );

        if (!member || member.role !== 'owner') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only owner can delete conversation',
          });
        }

        await conversationsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              archived_at: new Date(),
              updated_at: new Date(),
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'conversation.archived',
                tenant_id: tenantId,
                conversation_id: id,
                archived_by: userId,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to delete conversation');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to delete conversation',
        });
      }
    }
  );

  // Add member
  fastify.post<{
    Params: { id: string };
    Body: AddMemberInput;
  }>(
    '/conversations/:id/members',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: addMemberSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { user_id: newUserId, role } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const member = conversation.members?.find(
          (m: any) => m.user_id === userId
        );

        if (!member) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        if (member.role !== 'admin' && member.role !== 'owner') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only admins and owners can add members',
          });
        }

        const existingMember = conversation.members?.find(
          (m: any) => m.user_id === newUserId
        );

        if (existingMember) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'User is already a member',
          });
        }

        await conversationsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              members: {
                user_id: newUserId,
                role,
                joined_at: new Date(),
              },
            },
            $set: {
              updated_at: new Date(),
            },
          } as any
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'member.added',
                tenant_id: tenantId,
                conversation_id: id,
                added_by: userId,
                user_id: newUserId,
                role,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(201).send({
          user_id: newUserId,
          role,
          joined_at: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to add member');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to add member',
        });
      }
    }
  );

  // Remove member
  fastify.delete<{
    Params: { id: string; userId: string };
  }>(
    '/conversations/:id/members/:userId',
    {
      preHandler: [authMiddleware, tenantMiddleware],
    },
    async (request, reply) => {
      const { id, userId: targetUserId } = request.params;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const member = conversation.members?.find(
          (m: any) => m.user_id === userId
        );

        if (!member) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Not a member of this conversation',
          });
        }

        // Can remove self or if admin/owner
        if (
          targetUserId !== userId &&
          member.role !== 'admin' &&
          member.role !== 'owner'
        ) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only admins and owners can remove members',
          });
        }

        await conversationsCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $pull: {
              members: { user_id: targetUserId },
            },
            $set: {
              updated_at: new Date(),
            },
          } as any
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'member.removed',
                tenant_id: tenantId,
                conversation_id: id,
                removed_by: userId,
                user_id: targetUserId,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.code(204).send();
      } catch (error) {
        request.log.error({ error }, 'Failed to remove member');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to remove member',
        });
      }
    }
  );

  // Update member role
  fastify.put<{
    Params: { id: string; userId: string };
    Body: UpdateMemberRoleInput;
  }>(
    '/conversations/:id/members/:userId/role',
    {
      preHandler: [authMiddleware, tenantMiddleware],
      schema: {
        body: updateMemberRoleSchema,
      },
    },
    async (request, reply) => {
      const { id, userId: targetUserId } = request.params;
      const { role } = request.body;
      const userId = request.user!.user_id;
      const tenantId = request.tenantId!;

      try {
        const db = mongoClient.db();
        const conversationsCollection = db.collection(`tenant_${tenantId}_conversations`);

        const conversation = await conversationsCollection.findOne({
          _id: new ObjectId(id),
          archived_at: null,
        });

        if (!conversation) {
          return reply.code(404).send({
            error: 'NotFound',
            message: 'Conversation not found',
          });
        }

        const member = conversation.members?.find(
          (m: any) => m.user_id === userId
        );

        if (!member || member.role !== 'owner') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Only owner can update member roles',
          });
        }

        await conversationsCollection.updateOne(
          {
            _id: new ObjectId(id),
            'members.user_id': targetUserId,
          },
          {
            $set: {
              'members.$.role': role,
              updated_at: new Date(),
            },
          }
        );

        // Publish to Kafka
        await kafkaProducer.send({
          topic: 'conversation-events',
          messages: [
            {
              key: id,
              value: JSON.stringify({
                event: 'member.role_updated',
                tenant_id: tenantId,
                conversation_id: id,
                updated_by: userId,
                user_id: targetUserId,
                new_role: role,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        });

        return reply.send({
          user_id: targetUserId,
          role,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to update member role');
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'Failed to update member role',
        });
      }
    }
  );
}
