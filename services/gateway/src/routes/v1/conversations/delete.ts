import { FastifyInstance } from 'fastify';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';
import { deleteConversationSchema } from './schemas';
import { z } from 'zod';

export default async function (fastify: FastifyInstance, options: { userSettingsService: UserSettingsService }) {
    const { userSettingsService } = options;

    // Soft delete conversation (hide from list)
    // fastify.delete<{ Params: { id: string } }>('/:id', {
    //     schema: {
    //         params: deleteConversationSchema
    //     },
    //     handler: async (request: any, reply: any) => {
    //         const { id } = request.params;
    //         await userSettingsService.deleteConversation(request.user.id, id);
    //         return reply.status(204).send();
    //     },
    // });

    // Restore deleted conversation
    fastify.post<{ Params: { id: string } }>('/:id/restore', {
        handler: async (request: any, reply: any) => {
            const { id } = request.params;
            await userSettingsService.restoreConversation(request.user.id, id);
            return reply.status(204).send();
        },
    });

    // Clear history
    fastify.delete<{ Params: { id: string }, Querystring: { before?: string } }>('/:id/history', {
        schema: {
            querystring: z.object({
                before: z.string().datetime().optional()
            })
        },
        handler: async (request: any, reply: any) => {
            const { id } = request.params;
            const { before } = request.query;
            const beforeDate = before ? new Date(before) : undefined;
            await userSettingsService.clearHistory(request.user.id, id, beforeDate);
            return reply.status(204).send();
        },
    });

    // Get deleted conversations
    fastify.get('/deleted-conversations', {
        handler: async (request: any, reply: any) => {
            const deleted = await userSettingsService.getDeletedConversations(request.user.id);
            return reply.status(200).send(deleted);
        },
    });
}
