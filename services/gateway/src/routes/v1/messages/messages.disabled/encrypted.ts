/**
 * Encrypted Messages Routes
 * Server-assisted encryption/decryption (optional)
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const encryptRequestSchema = z.object({
  recipient_id: z.string(),
  recipient_device_id: z.number().default(1),
  message_type: z.enum(['text', 'media', 'file']),
  content: z.object({
    body: z.string().optional(),
    media_key: z.string().optional(),
    thumbnail: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

const decryptRequestSchema = z.object({
  sender_id: z.string(),
  sender_device_id: z.number(),
  encrypted_message: z.object({
    type: z.enum(['prekey', 'message']),
    ciphertext: z.string().describe('Base64 encoded ciphertext'),
    registration_id: z.number(),
    timestamp: z.number(),
  }),
});

const encryptedMessagesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Server-assisted message encryption
   * Note: This is less secure than client-side E2E encryption
   * Only use when client doesn't have crypto capabilities
   */
  fastify.post('/encrypt', {
    schema: {
      description: 'Server-assisted message encryption (less secure)',
      tags: ['messages', 'encryption'],
      security: [{ bearerAuth: [] }],
      body: encryptRequestSchema,
      response: {
        200: z.object({
          encrypted_message: z.object({
            type: z.enum(['prekey', 'message']),
            sender_device_id: z.number(),
            registration_id: z.number(),
            ciphertext: z.string(),
            timestamp: z.number(),
          }),
          session_established: z.boolean(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const senderId = request.user.sub;
    const body = request.body as z.infer<typeof encryptRequestSchema>;

    // TODO: Integrate with crypto-service
    // const encryptionService = fastify.cryptoServices.getMessageEncryptionService();
    //
    // // Check if session exists
    // const hasSession = await encryptionService.hasSession(senderId, body.recipient_id);
    //
    // // Encrypt message
    // const encryptedMessage = await encryptionService.encryptMessage({
    //   sender_id: senderId,
    //   recipient_id: body.recipient_id,
    //   recipient_device_id: body.recipient_device_id,
    //   message: {
    //     type: body.message_type,
    //     body: body.content.body,
    //     media_key: body.content.media_key ? Buffer.from(body.content.media_key, 'base64') : undefined,
    //     thumbnail: body.content.thumbnail ? Buffer.from(body.content.thumbnail, 'base64') : undefined,
    //     metadata: body.content.metadata || {},
    //   },
    // });

    fastify.log.info({ senderId, recipientId: body.recipient_id }, 'Message encrypted (server-assisted)');

    // Mock response
    return {
      encrypted_message: {
        type: 'message',
        sender_device_id: 1,
        registration_id: 12345,
        ciphertext: 'base64_encrypted_content_placeholder',
        timestamp: Date.now(),
      },
      session_established: true,
    };
  });

  /**
   * Server-assisted message decryption
   * Note: This is less secure than client-side E2E encryption
   * Only use when client doesn't have crypto capabilities
   */
  fastify.post('/decrypt', {
    schema: {
      description: 'Server-assisted message decryption (less secure)',
      tags: ['messages', 'encryption'],
      security: [{ bearerAuth: [] }],
      body: decryptRequestSchema,
      response: {
        200: z.object({
          message: z.object({
            type: z.enum(['text', 'media', 'file']),
            body: z.string().optional(),
            media_key: z.string().optional(),
            thumbnail: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
          }),
          sender_id: z.string(),
          timestamp: z.number(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const recipientId = request.user.sub;
    const body = request.body as z.infer<typeof decryptRequestSchema>;

    // TODO: Integrate with crypto-service
    // const encryptionService = fastify.cryptoServices.getMessageEncryptionService();
    //
    // // Decrypt message
    // const decryptedMessage = await encryptionService.decryptMessage({
    //   recipient_id: recipientId,
    //   sender_id: body.sender_id,
    //   sender_device_id: body.sender_device_id,
    //   encrypted_message: {
    //     type: body.encrypted_message.type,
    //     ciphertext: Buffer.from(body.encrypted_message.ciphertext, 'base64'),
    //     registration_id: body.encrypted_message.registration_id,
    //     timestamp: body.encrypted_message.timestamp,
    //   },
    // });

    fastify.log.info({ recipientId, senderId: body.sender_id }, 'Message decrypted (server-assisted)');

    // Mock response
    return {
      message: {
        type: 'text',
        body: 'Decrypted message content',
        metadata: {},
      },
      sender_id: body.sender_id,
      timestamp: body.encrypted_message.timestamp,
    };
  });

  /**
   * Get encryption mode for tenant
   */
  fastify.get('/encryption-mode', {
    schema: {
      description: 'Get encryption mode configuration for current tenant',
      tags: ['messages', 'encryption'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          mode: z.enum(['CLIENT_E2E', 'SERVER_ASSISTED', 'TRANSPORT_ONLY']),
          description: z.string(),
          client_encryption_required: z.boolean(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const tenantId = request.user.tenant_id;

    // TODO: Integrate with crypto-service
    // const encryptionMode = await encryptionModeService.getMode(tenantId);

    return {
      mode: 'CLIENT_E2E',
      description: 'Full client-side end-to-end encryption',
      client_encryption_required: true,
    };
  });
};

export default encryptedMessagesRoutes;
