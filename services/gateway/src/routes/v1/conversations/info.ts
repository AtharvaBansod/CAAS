import { FastifyInstance } from 'fastify';
import { GroupInfoService } from '@messaging-service/conversations/group-info.service';

export default async function (fastify: FastifyInstance, options: { groupInfoService: GroupInfoService }) {
  const { groupInfoService } = options;

  // Update description
  fastify.put('/:id/description', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { description } = request.body as { description: string };
      await groupInfoService.updateDescription(id, description, request.user.id);
      return reply.status(204).send();
    },
  });

  // Update avatar
  fastify.put('/:id/avatar', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { avatarUrl } = request.body as { avatarUrl: string };
      await groupInfoService.updateAvatar(id, avatarUrl, request.user.id);
      return reply.status(204).send();
    },
  });

  // Set announcement
  fastify.put('/:id/announcement', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { announcement } = request.body as { announcement: string };
      await groupInfoService.setAnnouncement(id, announcement, request.user.id);
      return reply.status(204).send();
    },
  });

  // Clear announcement
  fastify.delete('/:id/announcement', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      await groupInfoService.clearAnnouncement(id, request.user.id);
      return reply.status(204).send();
    },
  });

  // Update settings (e.g., announcements_only)
  fastify.put('/:id/settings', {
    handler: async (request: any, reply: any) => {
      const { id } = request.params as { id: string };
      const { announcements_only } = request.body as { announcements_only: boolean };
      await groupInfoService.setAnnouncementsOnly(id, announcements_only, request.user.id);
      return reply.status(204).send();
    },
  });
}