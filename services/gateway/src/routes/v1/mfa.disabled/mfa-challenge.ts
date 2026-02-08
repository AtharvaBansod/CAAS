/**
 * MFA Challenge Routes
 * Handle MFA verification during authentication
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const challengeRequestSchema = z.object({
  challenge_id: z.string(),
  method: z.enum(['totp', 'backup_code']),
  response: z.string(),
  trust_device: z.boolean().optional(),
});

const challengeResponseSchema = z.object({
  success: z.boolean(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  trust_token: z.string().optional(),
  message: z.string(),
});

const switchMethodRequestSchema = z.object({
  challenge_id: z.string(),
  method: z.enum(['totp', 'backup_code']),
});

const switchMethodResponseSchema = z.object({
  success: z.boolean(),
  method: z.string(),
  message: z.string(),
});

const methodsResponseSchema = z.object({
  methods: z.array(z.enum(['totp', 'backup_code', 'email', 'sms'])),
});

export const mfaChallengeRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/auth/mfa/challenge - Verify MFA response
  fastify.post<{
    Body: z.infer<typeof challengeRequestSchema>;
  }>('/challenge', {
    schema: {
      description: 'Verify MFA challenge response',
      tags: ['auth', 'mfa'],
      body: challengeRequestSchema,
      response: {
        200: challengeResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { challenge_id, method, response, trust_device } = request.body;

    const mfaChallengeService = fastify.authServices.getMFAChallengeService();
    const jwtGenerator = fastify.authServices.getJWTGenerator();
    const trustedDeviceService = fastify.authServices.getTrustedDeviceService();

    // Verify challenge
    const result = await mfaChallengeService.verifyChallenge(
      challenge_id,
      method,
      response
    );

    if (!result.success) {
      return reply.code(400).send({
        success: false,
        message: result.message || 'Invalid MFA response',
      });
    }

    // Challenge verified - complete authentication
    const { user_id, session_id } = result;

    // Generate tokens
    const tokens = await jwtGenerator.generateAccessToken({
      user: { id: user_id } as any,
      tenant: { id: result.tenant_id } as any,
      scopes: result.scopes || [],
      deviceId: result.device_id,
    });

    // Handle device trust if requested
    let trustToken: string | undefined;
    if (trust_device && result.device_id) {
      const trust = await trustedDeviceService.trustDevice(user_id, {
        device_id: result.device_id,
        device_name: result.device_name || 'Unknown Device',
        fingerprint: result.device_fingerprint || '',
      });
      trustToken = trust.token;
    }

    fastify.log.info({ user_id, method }, 'MFA challenge completed successfully');

    return reply.send({
      success: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      trust_token: trustToken,
      message: 'Authentication completed successfully',
    });
  });

  // POST /v1/auth/mfa/switch-method - Switch to different MFA method
  fastify.post<{
    Body: z.infer<typeof switchMethodRequestSchema>;
  }>('/switch-method', {
    schema: {
      description: 'Switch to a different MFA method',
      tags: ['auth', 'mfa'],
      body: switchMethodRequestSchema,
      response: {
        200: switchMethodResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { challenge_id, method } = request.body;

    const mfaChallengeService = fastify.authServices.getMFAChallengeService();

    // Switch method
    const challenge = await mfaChallengeService.switchMethod(challenge_id, method);

    return reply.send({
      success: true,
      method: challenge.method,
      message: `Switched to ${method} method`,
    });
  });

  // GET /v1/auth/mfa/methods - Get available MFA methods
  fastify.get<{
    Querystring: { user_id: string };
  }>('/methods', {
    schema: {
      description: 'Get available MFA methods for user',
      tags: ['auth', 'mfa'],
      querystring: z.object({
        user_id: z.string(),
      }),
      response: {
        200: methodsResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { user_id } = request.query;

    const mfaChallengeService = fastify.authServices.getMFAChallengeService();

    // Get available methods
    const methods = await mfaChallengeService.getAvailableMethods(user_id);

    return reply.send({
      methods,
    });
  });
};
