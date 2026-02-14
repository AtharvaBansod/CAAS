import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { InvitationService } from '@messaging-service/conversations/invitation.service';
import {
  conversationIdSchema,
  createInviteLinkBodySchema,
  joinViaInviteCodeParamsSchema,
} from './schemas';

export default async function (fastify: FastifyInstance, options: { invitationService: InvitationService }) {
  const { invitationService } = options;

  // Create invite link
  fastify.post<{
    Params: z.infer<typeof conversationIdSchema>;
    Body: z.infer<typeof createInviteLinkBodySchema>;
  }>(
    '/:id/invites',
    {
      schema: {
        params: conversationIdSchema,
        body: createInviteLinkBodySchema,
      },
    },
    async (request: any, reply: any) => {
      const { expires_at, max_uses, single_use, require_approval } = request.body;
      const inviteLink = await invitationService.createInviteLink(
        request.params.id,
        request.user.tenant_id,
        request.user.id,
        {
          expires_at: expires_at ? new Date(expires_at) : undefined,
          max_uses: max_uses ?? undefined,
          single_use: single_use ?? undefined,
          require_approval: require_approval ?? undefined,
        },
      );
      return reply.status(201).send(inviteLink);
    },
  );

  // List invite links for a conversation
  fastify.get<{
    Params: z.infer<typeof conversationIdSchema>;
  }>(
    '/:id/invites',
    {
      schema: {
        params: conversationIdSchema,
      },
    },
    async (request: any, reply: any) => {
      const inviteLinks = await invitationService.getInviteLinks(
        request.params.id,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(200).send(inviteLinks);
    },
  );

  // Revoke invite link
  fastify.delete<{
    Params: z.infer<typeof conversationIdSchema> & { linkId: string };
  }>(
    '/:id/invites/:linkId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          linkId: z.string().min(1)
        })
      },
    },
    async (request: any, reply: any) => {
      await invitationService.revokeInviteLink(
        request.params.linkId,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Join via invite code
  fastify.post<{
    Params: z.infer<typeof joinViaInviteCodeParamsSchema>;
  }>(
    '/join/:code',
    {
      schema: {
        params: joinViaInviteCodeParamsSchema,
      },
    },
    async (request: any, reply: any) => {
      const conversation = await invitationService.joinViaLink(
        request.params.code,
        request.user.id,
      );
      return reply.status(200).send(conversation);
    },
  );
}