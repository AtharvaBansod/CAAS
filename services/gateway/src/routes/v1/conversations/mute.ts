import { FastifyInstance } from 'fastify';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';

export default async function (fastify: FastifyInstance, options: { userSettingsService: UserSettingsService }) {
  const { userSettingsService } = options;

  // Mute conversation
  fastify.post('/:id/mute', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { duration, show_notifications, mention_exceptions } = request.body as any; // TODO: Define schema
      await userSettingsService.muteConversation(request.user.id, id, { duration, show_notifications, mention_exceptions });
      return reply.status(204).send();
    },
  });

  // Unmute conversation
  fastify.delete('/:id/unmute', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      await userSettingsService.unmuteConversation(request.user.id, id);
      return reply.status(204).send();
    },
  });

  // List muted conversations
  fastify.get('/muted', {
    handler: async (request: any, reply: any) => {
      const mutedConversations = await userSettingsService.getMutedConversations(request.user.id);
      return reply.status(200).send(mutedConversations);
    },
  });
}