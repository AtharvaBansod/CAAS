/**
 * Verification Routes
 * Safety numbers and key verification
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const verificationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get safety number for conversation with another user
   */
  fastify.get('/:userId/safety-number', {
    schema: {
      description: 'Get safety number for verifying conversation encryption',
      tags: ['verification', 'encryption'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: z.object({
          safety_number: z.string().describe('60-digit safety number'),
          formatted: z.string().describe('Formatted with spaces'),
          user1_id: z.string(),
          user2_id: z.string(),
          user1_identity_key_fingerprint: z.string(),
          user2_identity_key_fingerprint: z.string(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const currentUserId = request.user.sub;
    const { userId: otherUserId } = request.params as any;

    // TODO: Integrate with crypto-service
    // const safetyNumber = await safetyNumberGenerator.generate({
    //   user1_id: currentUserId,
    //   user1_identity_key: await keyServer.getIdentityKey(currentUserId),
    //   user2_id: otherUserId,
    //   user2_identity_key: await keyServer.getIdentityKey(otherUserId),
    // });

    // Mock response
    const mockSafetyNumber = '123456789012345678901234567890123456789012345678901234567890';
    const formatted = mockSafetyNumber.match(/.{1,5}/g)?.join(' ') || mockSafetyNumber;

    return {
      safety_number: mockSafetyNumber,
      formatted,
      user1_id: currentUserId,
      user2_id: otherUserId,
      user1_identity_key_fingerprint: 'ABCD1234',
      user2_identity_key_fingerprint: 'EFGH5678',
    };
  });

  /**
   * Get QR code for safety number verification
   */
  fastify.get('/:userId/qr-code', {
    schema: {
      description: 'Get QR code for safety number verification',
      tags: ['verification', 'encryption'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        userId: z.string(),
      }),
      querystring: z.object({
        format: z.enum(['svg', 'png']).default('png'),
      }),
      response: {
        200: z.object({
          qr_code: z.string().describe('Base64 encoded QR code image'),
          format: z.string(),
          safety_number: z.string(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const currentUserId = request.user.sub;
    const { userId: otherUserId } = request.params as any;
    const { format } = request.query as any;

    // TODO: Integrate with crypto-service
    // const safetyNumber = await safetyNumberGenerator.generate({
    //   user1_id: currentUserId,
    //   user1_identity_key: await keyServer.getIdentityKey(currentUserId),
    //   user2_id: otherUserId,
    //   user2_identity_key: await keyServer.getIdentityKey(otherUserId),
    // });
    //
    // const qrCode = await qrCodeGenerator.generate(safetyNumber, format);

    return {
      qr_code: 'base64_encoded_qr_code_placeholder',
      format,
      safety_number: '123456789012345678901234567890123456789012345678901234567890',
    };
  });

  /**
   * Mark conversation as verified
   */
  fastify.post('/:userId/verify', {
    schema: {
      description: 'Mark conversation with user as verified',
      tags: ['verification', 'encryption'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        userId: z.string(),
      }),
      body: z.object({
        safety_number: z.string().describe('Safety number that was verified'),
        verification_method: z.enum(['manual', 'qr_scan']).default('manual'),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          verified_at: z.string(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const currentUserId = request.user.sub;
    const { userId: otherUserId } = request.params as any;
    const { safety_number, verification_method } = request.body as any;

    // TODO: Integrate with crypto-service
    // // Verify the safety number matches
    // const actualSafetyNumber = await safetyNumberGenerator.generate({
    //   user1_id: currentUserId,
    //   user1_identity_key: await keyServer.getIdentityKey(currentUserId),
    //   user2_id: otherUserId,
    //   user2_identity_key: await keyServer.getIdentityKey(otherUserId),
    // });
    //
    // if (actualSafetyNumber !== safety_number) {
    //   return reply.code(400).send({
    //     success: false,
    //     message: 'Safety number does not match',
    //   });
    // }
    //
    // await verificationStore.markAsVerified({
    //   user1_id: currentUserId,
    //   user2_id: otherUserId,
    //   verification_method,
    // });

    fastify.log.info({ currentUserId, otherUserId, verification_method }, 'Conversation verified');

    return {
      success: true,
      message: 'Conversation marked as verified',
      verified_at: new Date().toISOString(),
    };
  });

  /**
   * Remove verification status
   */
  fastify.delete('/:userId/verify', {
    schema: {
      description: 'Remove verification status for conversation',
      tags: ['verification', 'encryption'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        userId: z.string(),
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
    const currentUserId = request.user.sub;
    const { userId: otherUserId } = request.params as any;

    // TODO: Integrate with crypto-service
    // await verificationStore.removeVerification({
    //   user1_id: currentUserId,
    //   user2_id: otherUserId,
    // });

    fastify.log.info({ currentUserId, otherUserId }, 'Verification removed');

    return {
      success: true,
      message: 'Verification removed',
    };
  });

  /**
   * Get verification status
   */
  fastify.get('/:userId/status', {
    schema: {
      description: 'Get verification status for conversation',
      tags: ['verification', 'encryption'],
      security: [{ bearerAuth: [] }],
      params: z.object({
        userId: z.string(),
      }),
      response: {
        200: z.object({
          is_verified: z.boolean(),
          verified_at: z.string().nullable(),
          verification_method: z.string().nullable(),
          identity_key_changed: z.boolean(),
        }),
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const currentUserId = request.user.sub;
    const { userId: otherUserId } = request.params as any;

    // TODO: Integrate with crypto-service
    // const status = await verificationStore.getVerificationStatus({
    //   user1_id: currentUserId,
    //   user2_id: otherUserId,
    // });

    return {
      is_verified: false,
      verified_at: null,
      verification_method: null,
      identity_key_changed: false,
    };
  });
};

export default verificationRoutes;
