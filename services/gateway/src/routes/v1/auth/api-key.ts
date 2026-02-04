import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { generateRandomString, hashString } from '../../../utils/crypto';
import { UnauthorizedError, ForbiddenError } from '../../../errors';

// Mock DB for API Keys
interface ApiKeyRecord {
  id: string;
  key_hash: string;
  prefix: string;
  name: string;
  tenant_id: string;
  scopes: string[];
  created_at: Date;
  last_used_at?: Date;
}

const apiKeys: ApiKeyRecord[] = [];

const createKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
});

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  // Require Authentication for management
  fastify.addHook('preHandler', async (request) => {
    if (!request.user) {
      throw new UnauthorizedError('Authentication required');
    }
  });

  fastify.post('/api-keys', {
    schema: {
      body: createKeySchema,
      tags: ['Auth'],
      description: 'Create a new API Key',
      response: {
        201: z.object({
          id: z.string(),
          key: z.string(), // Only returned once
          name: z.string(),
          prefix: z.string(),
          created_at: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    const { name, scopes } = request.body as z.infer<typeof createKeySchema>;
    const user = request.user;
    const tenantId = user?.tenantId; // Assumes user is attached

    if (!tenantId) {
      throw new ForbiddenError('No tenant context');
    }

    const keyString = `sk_${generateRandomString(32)}`;
    const prefix = keyString.substring(0, 7);
    const keyHash = hashString(keyString);

    const newKey: ApiKeyRecord = {
      id: generateRandomString(16),
      key_hash: keyHash,
      prefix,
      name,
      tenant_id: tenantId,
      scopes,
      created_at: new Date(),
    };

    apiKeys.push(newKey);

    reply.status(201).send({
      id: newKey.id,
      key: keyString,
      name: newKey.name,
      prefix: newKey.prefix,
      created_at: newKey.created_at.toISOString(),
    });
  });

  fastify.get('/api-keys', {
    schema: {
      tags: ['Auth'],
      description: 'List API Keys',
      response: {
        200: z.array(z.object({
          id: z.string(),
          name: z.string(),
          prefix: z.string(),
          created_at: z.string(),
          last_used_at: z.string().optional(),
        })),
      },
    },
  }, async (request) => {
    const user = request.user;
    const tenantId = user?.tenantId;
    if (!tenantId) return [];
    
    return apiKeys
      .filter(k => k.tenant_id === tenantId)
      .map(k => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        created_at: k.created_at.toISOString(),
        last_used_at: k.last_used_at?.toISOString(),
      }));
  });

  fastify.delete('/api-keys/:id', {
    schema: {
      params: z.object({ id: z.string() }),
      tags: ['Auth'],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    const tenantId = user?.tenantId;

    if (tenantId) {
      const index = apiKeys.findIndex(k => k.id === id && k.tenant_id === tenantId);
      if (index !== -1) {
        apiKeys.splice(index, 1);
      }
    }

    reply.status(204).send();
  });
};

export default apiKeyRoutes;
