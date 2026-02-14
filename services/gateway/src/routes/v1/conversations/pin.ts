import { FastifyInstance } from 'fastify';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';
import { z } from 'zod';

export default async function (fastify: FastifyInstance, options: { userSettingsService: UserSettingsService }) {
    const { userSettingsService } = options;

    // Pin conversation
    fastify.post<{ Params: { id: string } }>('/:id/pin', {
        handler: async (request: any, reply: any) => {
            const { id } = request.params;
            await userSettingsService.pinConversation(request.user.id, id);
            return reply.status(204).send();
        },
    });

    // Unpin conversation
    fastify.delete<{ Params: { id: string } }>('/:id/unpin', {
        handler: async (request: any, reply: any) => {
            const { id } = request.params;
            await userSettingsService.unpinConversation(request.user.id, id);
            return reply.status(204).send();
        },
    });

    // Reorder pinned conversations
    fastify.put<{ Body: { conversation_ids: string[] } }>('/pinned/reorder', {
        schema: {
            body: z.object({
                conversation_ids: z.array(z.string()).min(1)
            })
        },
        handler: async (request: any, reply: any) => {
            const { conversation_ids } = request.body;
            await userSettingsService.reorderPinnedConversations(request.user.id, conversation_ids);
            return reply.status(204).send();
        },
    });

    // Get pinned conversations
    fastify.get('/pinned-conversations', {
        handler: async (request: any, reply: any) => {
            const pinned = await userSettingsService.getPinnedConversations(request.user.id);
            return reply.status(200).send(pinned);
        },
    });
}
