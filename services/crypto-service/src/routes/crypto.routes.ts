/**
 * Crypto Routes
 * Phase 4.5.2 - Task 03: Service Integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EncryptionService } from '../services/encryption.service';

export async function cryptoRoutes(fastify: FastifyInstance) {
  const encryptionService = new EncryptionService();

  // Generate encryption key
  fastify.post('/api/v1/keys/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant_id, key_type } = request.body as { tenant_id: string; key_type: 'master' | 'data' | 'session' };

    if (!tenant_id || !key_type) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const key_id = await encryptionService.generateKey(tenant_id, key_type);
      return reply.code(201).send({ key_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to generate key' });
    }
  });

  // Encrypt data
  fastify.post('/api/v1/encrypt', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key_id, plaintext } = request.body as { key_id: string; plaintext: string };

    if (!key_id || !plaintext) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const result = await encryptionService.encrypt(key_id, plaintext);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to encrypt data' });
    }
  });

  // Decrypt data
  fastify.post('/api/v1/decrypt', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key_id, ciphertext, iv, authTag } = request.body as {
      key_id: string;
      ciphertext: string;
      iv: string;
      authTag: string;
    };

    if (!key_id || !ciphertext || !iv || !authTag) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const plaintext = await encryptionService.decrypt(key_id, ciphertext, iv, authTag);
      return reply.code(200).send({ plaintext });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to decrypt data' });
    }
  });

  // Rotate encryption key
  fastify.post('/api/v1/keys/:keyId/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { keyId } = request.params as { keyId: string };
    const { tenant_id } = request.body as { tenant_id: string };

    if (!tenant_id) {
      return reply.code(400).send({ error: 'Missing tenant_id' });
    }

    try {
      const new_key_id = await encryptionService.rotateKey(keyId, tenant_id);
      return reply.code(200).send({ new_key_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to rotate key' });
    }
  });

  // Get tenant keys
  fastify.get('/api/v1/keys/:tenantId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };

    try {
      const keys = await encryptionService.getTenantKeys(tenantId);
      return reply.code(200).send({ keys });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get tenant keys' });
    }
  });
}
