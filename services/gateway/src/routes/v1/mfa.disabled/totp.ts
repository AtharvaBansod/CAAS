/**
 * TOTP Routes
 * Time-based One-Time Password authentication
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const setupResponseSchema = z.object({
  secret: z.string(),
  uri: z.string(),
  qr_code: z.string(),
});

const verifyRequestSchema = z.object({
  secret: z.string(),
  token: z.string().length(6),
});

const verifyResponseSchema = z.object({
  success: z.boolean(),
  backup_codes: z.array(z.string()).optional(),
  message: z.string(),
});

const challengeRequestSchema = z.object({
  token: z.string().length(6),
});

const challengeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const totpRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/mfa/totp/setup - Start TOTP setup
  fastify.post('/setup', {
    schema: {
      description: 'Start TOTP setup and get QR code',
      tags: ['mfa', 'totp'],
      security: [{ bearerAuth: [] }],
      response: {
        200: setupResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    const totpService = fastify.authServices.getTOTPService();

    // Generate secret and QR code
    const setup = await totpService.generateSecret(userId);

    return reply.send(setup);
  });

  // POST /v1/mfa/totp/verify - Verify and enable TOTP
  fastify.post<{
    Body: z.infer<typeof verifyRequestSchema>;
  }>('/verify', {
    schema: {
      description: 'Verify TOTP token and enable MFA',
      tags: ['mfa', 'totp'],
      security: [{ bearerAuth: [] }],
      body: verifyRequestSchema,
      response: {
        200: verifyResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;
    const { secret, token } = request.body;

    const totpService = fastify.authServices.getTOTPService();
    const backupCodeService = fastify.authServices.getBackupCodeService();

    // Verify token
    const isValid = await totpService.verifyToken(secret, token);

    if (!isValid) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid TOTP token',
      });
    }

    // Enable TOTP
    await totpService.enableTOTP(userId, secret, token);

    // Generate backup codes
    const backupCodes = await backupCodeService.generateCodes(userId);

    fastify.log.info({ userId }, 'TOTP enabled for user');

    return reply.send({
      success: true,
      backup_codes: backupCodes,
      message: 'TOTP enabled successfully. Save your backup codes securely.',
    });
  });

  // DELETE /v1/mfa/totp - Disable TOTP
  fastify.delete('/disable', {
    schema: {
      description: 'Disable TOTP (requires password confirmation)',
      tags: ['mfa', 'totp'],
      security: [{ bearerAuth: [] }],
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

    const totpService = fastify.authServices.getTOTPService();

    // Disable TOTP
    await totpService.disableTOTP(userId);

    fastify.log.warn({ userId }, 'TOTP disabled for user');

    return reply.send({
      success: true,
      message: 'TOTP disabled successfully',
    });
  });

  // POST /v1/mfa/totp/challenge - Verify TOTP during login
  fastify.post<{
    Body: z.infer<typeof challengeRequestSchema>;
  }>('/challenge', {
    schema: {
      description: 'Verify TOTP token during login',
      tags: ['mfa', 'totp'],
      body: challengeRequestSchema,
      response: {
        200: challengeResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { token } = request.body;
    
    // This would be called during MFA challenge flow
    // The challenge ID would be in session or request context
    
    return reply.code(501).send({
      success: false,
      message: 'Use /v1/auth/mfa/challenge endpoint instead',
    });
  });
};
