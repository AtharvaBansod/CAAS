import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ModerationService } from '@messaging-service/conversations/moderation.service';
import { PinnedMessagesService } from '@messaging-service/conversations/pinned-messages.service';
import {
  conversationIdSchema,
  userIdSchema,
  messageIdSchema,
  muteUserBodySchema,
  banUserBodySchema,
} from './schemas';

export default async function (
  fastify: FastifyInstance,
  options: { moderationService: ModerationService; pinnedMessagesService: PinnedMessagesService },
) {
  const { moderationService, pinnedMessagesService } = options;

  // Mute user
  fastify.post<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof userIdSchema>;
    Body: z.infer<typeof muteUserBodySchema>;
  }>(
    '/:id/mute/:userId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          userId: z.string().min(1)
        }),
        body: muteUserBodySchema,
      },
    },
    async (request: any, reply: any) => {
      const { duration } = request.body;
      await moderationService.muteUser(
        request.params.id,
        request.params.userId,
        request.user.tenant_id,
        duration,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Unmute user
  fastify.delete<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof userIdSchema>;
  }>(
    '/:id/unmute/:userId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          userId: z.string().min(1)
        }),
      },
    },
    async (request: any, reply: any) => {
      await moderationService.unmuteUser(
        request.params.id,
        request.params.userId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Ban user
  fastify.post<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof userIdSchema>;
    Body: z.infer<typeof banUserBodySchema>;
  }>(
    '/:id/ban/:userId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          userId: z.string().min(1)
        }),
        body: banUserBodySchema,
      },
    },
    async (request: any, reply: any) => {
      const { reason } = request.body;
      await moderationService.banUser(
        request.params.id,
        request.params.userId,
        request.user.tenant_id,
        request.user.id,
        reason,
      );
      return reply.status(204).send();
    },
  );

  // Unban user
  fastify.delete<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof userIdSchema>;
  }>(
    '/:id/ban/:userId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          userId: z.string().min(1)
        }),
      },
    },
    async (request: any, reply: any) => {
      await moderationService.unbanUser(
        request.params.id,
        request.params.userId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Delete message
  fastify.delete<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof messageIdSchema>;
  }>(
    '/:id/messages/:messageId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          messageId: z.string().min(1)
        }),
      },
    },
    async (request: any, reply: any) => {
      await moderationService.deleteMessage(
        request.params.id,
        request.params.messageId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Pin message
  fastify.post<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof messageIdSchema>;
  }>(
    '/:id/pin/:messageId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          messageId: z.string().min(1)
        }),
      },
    },
    async (request: any, reply: any) => {
      await pinnedMessagesService.pinMessage(
        request.params.id,
        request.params.messageId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Unpin message
  fastify.delete<{
    Params: z.infer<typeof conversationIdSchema> & z.infer<typeof messageIdSchema>;
  }>(
    '/:id/pin/:messageId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          messageId: z.string().min(1)
        }),
      },
    },
    async (request: any, reply: any) => {
      await pinnedMessagesService.unpinMessage(
        request.params.id,
        request.params.messageId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Get pinned messages
  fastify.get<{
    Params: z.infer<typeof conversationIdSchema>;
  }>(
    '/:id/pinned-messages',
    {
      schema: {
        params: conversationIdSchema,
      },
    },
    async (request: any, reply: any) => {
      const pinnedMessages = await pinnedMessagesService.getPinnedMessages(request.params.id);
      return reply.status(200).send(pinnedMessages);
    },
  );
}
