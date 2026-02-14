import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { webhookService } from '../../../services/webhook-service';
import { UnauthorizedError } from '../../../errors';
import { createWebhookSchema, webhookResponseSchema, CreateWebhookInput } from '../../../schemas/validators/webhook';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Ensure tenant context exists
  fastify.addHook('preHandler', async (request) => {
    if (!request.tenant) {
      throw new UnauthorizedError('Tenant context required');
    }
  });

  fastify.post('/', {
    schema: {
      body: createWebhookSchema,
      tags: ['Webhooks'],
      response: {
        201: webhookResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { url, events } = request.body as CreateWebhookInput;
    const tenantId = request.tenant!.tenant_id;

    const webhook = await webhookService.createWebhook(tenantId, { url, events });

    reply.status(201).send(webhook);
  });

  fastify.get('/', {
    schema: {
      tags: ['Webhooks'],
    },
  }, async (request) => {
    const tenantId = request.tenant!.tenant_id;
    return webhookService.getWebhooks(tenantId);
  });

  fastify.delete('/:id', {
    schema: {
      tags: ['Webhooks'],
      params: z.object({ id: z.string() }),
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.tenant!.tenant_id;

    await webhookService.deleteWebhook(tenantId, id);
    reply.status(204).send();
  });
};

export default webhookRoutes;
