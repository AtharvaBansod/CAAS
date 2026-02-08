/**
 * Backup Codes Routes
 * Recovery codes for MFA when TOTP device is unavailable
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const remainingResponseSchema = z.object({
  remaining: z.number(),
  total: z.number(),
});

const regenerateResponseSchema = z.object({
  success: z.boolean(),
  codes: z.array(z.string()),
  message: z.string(),
});

const verifyRequestSchema = z.object({
  code: z.string(),
});

const verifyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const backupCodesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /v1/mfa/backup-codes - Get remaining backup code count
  fastify.get('/', {
    schema: {
      description: 'Get remaining backup code count',
      tags: ['mfa', 'backup-codes'],
      security: [{ bearerAuth: [] }],
      response: {
        200: remainingResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    const backupCodeService = fastify.authServices.getBackupCodeService();

    // Get remaining count
    const remaining = await backupCodeService.getRemainingCount(userId);
    const total = fastify.config.MFA_BACKUP_CODE_COUNT || 10;

    return reply.send({
      remaining,
      total,
    });
  });

  // POST /v1/mfa/backup-codes/regenerate - Generate new backup codes
  fastify.post('/regenerate', {
    schema: {
      description: 'Generate new backup codes (invalidates old ones)',
      tags: ['mfa', 'backup-codes'],
      security: [{ bearerAuth: [] }],
      response: {
        200: regenerateResponseSchema,
      },
    },
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const userId = request.user.sub;

    const backupCodeService = fastify.authServices.getBackupCodeService();

    // Regenerate codes
    const codes = await backupCodeService.regenerateCodes(userId);

    fastify.log.info({ userId }, 'Backup codes regenerated');

    return reply.send({
      success: true,
      codes,
      message: 'New backup codes generated. Save them securely - they will not be shown again.',
    });
  });

  // POST /v1/mfa/backup-codes/verify - Verify backup code during login
  fastify.post<{
    Body: z.infer<typeof verifyRequestSchema>;
  }>('/verify', {
    schema: {
      description: 'Verify backup code during login',
      tags: ['mfa', 'backup-codes'],
      body: verifyRequestSchema,
      response: {
        200: verifyResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { code } = request.body;
    
    // This would be called during MFA challenge flow
    // The challenge ID would be in session or request context
    
    return reply.code(501).send({
      success: false,
      message: 'Use /v1/auth/mfa/challenge endpoint instead',
    });
  });
};
