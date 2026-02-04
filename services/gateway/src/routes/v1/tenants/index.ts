import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { UnauthorizedError } from '../../../errors';
import { tenantService } from '../../../services/tenant-service';
import { updateSettingsSchema, tenantResponseSchema, usageResponseSchema, UpdateSettingsInput } from '../../../schemas/validators/tenant';

const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // Ensure tenant context is available
  fastify.addHook('preHandler', async (request) => {
    if (!request.tenant) {
      throw new UnauthorizedError('Tenant context required');
    }
  });

  fastify.get('/', {
    schema: {
      tags: ['Tenant'],
      description: 'Get current tenant details',
      response: {
        200: tenantResponseSchema,
      },
    },
  }, async (request) => {
    const { tenant_id, name, plan } = request.tenant!;
    return { tenant_id, name, plan };
  });

  fastify.put('/settings', {
    schema: {
      body: updateSettingsSchema,
      tags: ['Tenant'],
      description: 'Update tenant settings',
    },
  }, async (request, reply) => {
    const { settings } = request.body as UpdateSettingsInput;
    // Mock update
    request.log.info({ tenantId: request.tenant!.tenant_id, settings }, 'Updating tenant settings');
    
    reply.send({ success: true });
  });

  fastify.get('/usage', {
    schema: {
      tags: ['Tenant'],
      description: 'Get tenant usage statistics',
      response: {
        200: usageResponseSchema,
      },
    },
  }, async (request) => {
    // Mock usage stats
    return {
      api_calls: 1500,
      storage_used_gb: 2.5,
      users_active: 45,
    };
  });
};

export default tenantRoutes;
