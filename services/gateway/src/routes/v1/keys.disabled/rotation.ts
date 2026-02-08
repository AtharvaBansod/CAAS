/**
 * Key Rotation Routes
 * API endpoints for key rotation and revocation
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const rotateIdentitySchema = z.object({
  new_identity_key: z.string().describe('Base64 encoded new identity public key'),
  new_signed_pre_key: z.object({
    key_id: z.number(),
    public_key: z.string(),
    signature: z.string(),
    timestamp: z.number(),
  }),
  reason: z.enum(['scheduled', 'manual', 'compromise', 'device_change']).optional(),
});

const revokeKeySchema = z.object({
  key_id: z.string(),
  key_type: z.enum(['identity', 'signed_pre_key', 'pre_key']),
  reason: z.enum(['USER_INITIATED', 'KEY_COMPROMISE', 'DEVICE_LOST', 'ADMIN_ACTION']),
});

const rotationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Rotate identity key
   */
  fastify.post('/rotate/identity', {
    schema: {
      description: 'Rotate identity key (generates new key pair)',
      tags: ['keys', 'rotation'],
      security: [{ bearerAuth: [] }],
      body: rotateIdentitySchema,
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          rotation_id: z.string(),
          contacts_notified: z.number(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const tenantId = request.user.tenant_id;
    const body = request.body as z.infer<typeof rotateIdentitySchema>;

    // TODO: Integrate with crypto-service
    // const result = await keyRotationService.rotateIdentityKey({
    //   user_id: userId,
    //   tenant_id: tenantId,
    //   new_identity_key: Buffer.from(body.new_identity_key, 'base64'),
    //   new_signed_pre_key: {
    //     key_id: body.new_signed_pre_key.key_id,
    //     public_key: Buffer.from(body.new_signed_pre_key.public_key, 'base64'),
    //     signature: Buffer.from(body.new_signed_pre_key.signature, 'base64'),
    //     timestamp: body.new_signed_pre_key.timestamp,
    //   },
    //   reason: body.reason || 'manual',
    // });

    fastify.log.info({ userId, reason: body.reason }, 'Identity key rotation initiated');

    return {
      success: true,
      message: 'Identity key rotation initiated',
      rotation_id: 'rotation-' + Date.now(),
      contacts_notified: 0, // TODO: Get from result
    };
  });

  /**
   * Revoke a key
   */
  fastify.post('/revoke', {
    schema: {
      description: 'Revoke a cryptographic key',
      tags: ['keys', 'revocation'],
      security: [{ bearerAuth: [] }],
      body: revokeKeySchema,
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          revoked_at: z.string(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const body = request.body as z.infer<typeof revokeKeySchema>;

    // TODO: Integrate with crypto-service
    // await keyRevocationService.revokeKey({
    //   user_id: userId,
    //   key_id: body.key_id,
    //   key_type: body.key_type,
    //   reason: body.reason,
    // });

    fastify.log.warn({ userId, keyId: body.key_id, reason: body.reason }, 'Key revoked');

    return {
      success: true,
      message: 'Key revoked successfully',
      revoked_at: new Date().toISOString(),
    };
  });

  /**
   * Get key rotation status
   */
  fastify.get('/rotation-status', {
    schema: {
      description: 'Get key rotation status for current user',
      tags: ['keys', 'rotation'],
      security: [{ bearerAuth: [] }],
      response: {
        200: z.object({
          identity_key: z.object({
            last_rotated: z.string().nullable(),
            next_scheduled: z.string().nullable(),
            rotation_count: z.number(),
          }),
          signed_pre_key: z.object({
            last_rotated: z.string().nullable(),
            next_scheduled: z.string(),
            rotation_count: z.number(),
          }),
          pre_keys: z.object({
            available_count: z.number(),
            needs_replenishment: z.boolean(),
          }),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    // TODO: Integrate with crypto-service
    // const status = await keyRotationService.getRotationStatus(userId);

    return {
      identity_key: {
        last_rotated: null,
        next_scheduled: null,
        rotation_count: 0,
      },
      signed_pre_key: {
        last_rotated: null,
        next_scheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rotation_count: 0,
      },
      pre_keys: {
        available_count: 0,
        needs_replenishment: true,
      },
    };
  });

  /**
   * Force rotate signed pre-key
   */
  fastify.post('/rotate/signed-prekey', {
    schema: {
      description: 'Force rotate signed pre-key',
      tags: ['keys', 'rotation'],
      security: [{ bearerAuth: [] }],
      body: z.object({
        device_id: z.number().default(1),
        new_signed_pre_key: z.object({
          key_id: z.number(),
          public_key: z.string(),
          signature: z.string(),
          timestamp: z.number(),
        }),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const body = request.body as any;

    // TODO: Integrate with crypto-service
    // await keyRotationService.rotateSignedPreKey({
    //   user_id: userId,
    //   device_id: body.device_id,
    //   new_signed_pre_key: {
    //     key_id: body.new_signed_pre_key.key_id,
    //     public_key: Buffer.from(body.new_signed_pre_key.public_key, 'base64'),
    //     signature: Buffer.from(body.new_signed_pre_key.signature, 'base64'),
    //     timestamp: body.new_signed_pre_key.timestamp,
    //   },
    // });

    fastify.log.info({ userId, deviceId: body.device_id }, 'Signed pre-key rotated');

    return {
      success: true,
      message: 'Signed pre-key rotated successfully',
    };
  });
};

export default rotationRoutes;
