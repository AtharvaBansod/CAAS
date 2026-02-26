import { FastifyInstance } from 'fastify';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';

export default async function (fastify: FastifyInstance, options: { userSettingsService: UserSettingsService }) {
  const { userSettingsService } = options;

  // Archive conversation
  fastify.post<{ Params: { id: string } }>('/:id/archive', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params;
      await userSettingsService.archiveConversation(request.user.id, id);
      return reply.status(204).send();
    },
  });

  // Unarchive conversation
  fastify.delete<{ Params: { id: string } }>('/:id/unarchive', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params;
      await userSettingsService.unarchiveConversation(request.user.id, id);
      return reply.status(204).send();
    },
  });

  // List archived conversations
  fastify.get('/archived', {
    handler: async (request: any, reply: any) => {
      const archivedConversations = await userSettingsService.getArchivedConversations(request.user.id);
      return reply.status(200).send(archivedConversations);
    },
  });

  // Check if conversation is archived
  fastify.get<{ Params: { id: string } }>('/:id/archived', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params;
      const isArchived = await userSettingsService.isArchived(request.user.id, id);
      return reply.status(200).send({ is_archived: isArchived });
    },
  });
}
