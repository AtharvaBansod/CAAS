import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { conversationIdSchema, addMembersBodySchema, updateMemberRoleBodySchema } from './schemas';
import { GroupConversationService } from '@messaging-service/conversations/group-conversation.service';

export default async function (fastify: FastifyInstance, options: { groupConversationService: GroupConversationService }) {
  const { groupConversationService } = options;
  const typedFastify = fastify.withTypeProvider<ZodTypeProvider>();

  // Add members
  typedFastify.post(
    '/:id/members',
    {
      schema: {
        params: conversationIdSchema,
        body: addMembersBodySchema,
      },
    },
    async (request, reply) => {
      await groupConversationService.addMembers(
        request.params.id,
        request.user.tenant_id,
        request.body.member_ids,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Remove member
  typedFastify.delete(
    '/:id/members/:memberId',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          memberId: z.string().min(1)
        })
      },
    },
    async (request, reply) => {
      await groupConversationService.removeMembers(
        request.params.id,
        request.user.tenant_id,
        [request.params.memberId],
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Update member role
  typedFastify.put(
    '/:id/members/:memberId/role',
    {
      schema: {
        params: z.object({
          id: z.string().min(1),
          memberId: z.string().min(1)
        }),
        body: updateMemberRoleBodySchema,
      },
    },
    async (request, reply) => {
      await groupConversationService.updateMemberRole(
        request.params.id,
        request.user.tenant_id,
        request.params.memberId,
        request.body.role,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );

  // Get members
  typedFastify.get(
    '/:id/members',
    {
      schema: {
        params: conversationIdSchema,
      },
    },
    async (request, reply) => {
      const members = await groupConversationService.getMembers(
        request.params.id,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(200).send(members);
    },
  );

  // Leave group
  typedFastify.post(
    '/:id/leave',
    {
      schema: {
        params: conversationIdSchema,
      },
    },
    async (request, reply) => {
      await groupConversationService.leaveGroup(
        request.params.id,
        request.user.tenant_id,
        request.user.id,
      );
      return reply.status(204).send();
    },
  );
}
