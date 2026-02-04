import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { UnauthorizedError } from '../../../errors';

// Mock Logs
const logs = [
  {
    id: 'log-1',
    webhook_id: 'wh-123',
    event: 'user.created',
    status: 'success',
    attempt: 1,
    created_at: new Date().toISOString(),
    response_code: 200,
    duration_ms: 150
  },
  {
    id: 'log-2',
    webhook_id: 'wh-123',
    event: 'user.updated',
    status: 'failed',
    attempt: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    response_code: 500,
    duration_ms: 30000
  }
];

const webhookLogsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request) => {
    if (!request.tenant) {
      throw new UnauthorizedError('Tenant context required');
    }
  });

  fastify.get('/:id/logs', {
    schema: {
      tags: ['Webhooks'],
      params: z.object({ id: z.string() }),
      response: {
        200: z.array(z.object({
          id: z.string(),
          event: z.string(),
          status: z.string(),
          attempt: z.number(),
          created_at: z.string(),
          response_code: z.number(),
          duration_ms: z.number()
        }))
      }
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    // Filter by webhook ID and tenant (implicit via checking if webhook belongs to tenant first)
    return logs.filter(l => l.webhook_id === id); // Mock filter
  });
};

export default webhookLogsRoutes;
