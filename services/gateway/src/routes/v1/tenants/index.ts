import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { UnauthorizedError } from '../../../errors';
import { tenantService } from '../../../services/tenant-service';
import { updateSettingsSchema, tenantResponseSchema, usageResponseSchema, UpdateSettingsInput } from '../../../schemas/validators/tenant';

const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  function resolveClientContext(request: any): { clientId?: string; tenantId?: string } {
    return {
      clientId: request.auth?.metadata?.client_id || request.user?.client_id || request.user?.id,
      tenantId: request.auth?.tenant_id || request.user?.tenant_id || request.user?.tenantId || request.tenant?.tenant_id,
    };
  }

  async function loadClientRecord(request: any) {
    const { clientId, tenantId } = resolveClientContext(request);
    const collection = fastify.mongo?.client?.db('caas_platform')?.collection('clients');
    if (!collection) return null;

    if (clientId && typeof clientId === 'string') {
      const byClientId = await collection.findOne({ client_id: clientId, status: { $ne: 'deleted' } });
      if (byClientId) return byClientId;
    }

    if (tenantId && typeof tenantId === 'string') {
      return collection.findOne({ tenant_id: tenantId, status: { $ne: 'deleted' } });
    }

    return null;
  }

  function tenantNotFoundResponse(request: any, context: { tenantId?: string; clientId?: string }) {
    return {
      statusCode: 404,
      error: 'Error',
      message: 'Tenant context is valid but tenant record was not found',
      code: 'tenant_not_found',
      diagnostics: {
        tenant_id: context.tenantId || null,
        client_id: context.clientId || null,
        correlation_id: request.id || request.headers['x-correlation-id'] || null,
        source: 'gateway.tenants',
      },
    };
  }

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
  }, async (request, reply) => {
    const context = resolveClientContext(request as any);
    const client = await loadClientRecord(request as any);
    if (client) {
      return {
        tenant_id: client.tenant_id,
        client_id: client.client_id,
        name: client.company_name,
        plan: client.plan,
        settings: client.settings || {},
      };
    }
    return reply.code(404).send(tenantNotFoundResponse(request, context));
  });

  fastify.put('/settings', {
    schema: {
      body: updateSettingsSchema,
      tags: ['Tenant'],
      description: 'Update tenant settings',
    },
  }, async (request, reply) => {
    const { settings } = request.body as UpdateSettingsInput;
    const collection = fastify.mongo?.client?.db('caas_platform')?.collection('clients');
    const context = resolveClientContext(request as any);
    const tenantId = context.tenantId || request.tenant!.tenant_id;

    if (!collection) {
      request.log.error('MongoDB collection clients not available');
      return reply.code(500).send({
        success: false,
        error: 'Database unavailable',
      });
    }

    if (!settings || typeof settings !== 'object') {
      return reply.code(400).send({
        success: false,
        error: 'Invalid settings payload',
      });
    }

    const updateResult = await collection.updateOne(
      { tenant_id: tenantId, status: { $ne: 'deleted' } },
      {
        $set: {
          settings,
          updated_at: new Date(),
        },
      },
      { upsert: false }
    );

    if (!updateResult.matchedCount) {
      return reply.code(404).send(tenantNotFoundResponse(request, context));
    }

    request.log.info({ tenantId, settingsKeys: Object.keys(settings || {}) }, 'Updated tenant settings');
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
  }, async (request, reply) => {
    const { DashboardStatsService } = await import('../../../services/dashboard-stats');
    const statsService = new DashboardStatsService(fastify.mongo.client);
    const context = resolveClientContext(request as any);
    const tenantId = context.tenantId || request.tenant!.tenant_id;
    const clientRecord = await loadClientRecord(request as any);
    if (!clientRecord) {
      return reply.code(404).send(tenantNotFoundResponse(request, context));
    }
    const stats = await statsService.getStats(tenantId);

    const mediaCollection = fastify.mongo.client.db('caas_platform').collection('media_files');
    const storageAgg = await mediaCollection.aggregate([
      {
        $match: {
          tenant_id: tenantId,
          file_size_bytes: { $type: 'number' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$file_size_bytes' },
        },
      },
    ]).toArray();
    const totalBytes = storageAgg[0]?.total || 0;
    const storageUsedGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(4));

    return {
      api_calls: stats.api_calls,
      storage_used_gb: storageUsedGb,
      users_active: stats.active_users,
    };
  });
};

export default tenantRoutes;
