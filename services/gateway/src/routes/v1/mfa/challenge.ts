import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { verify as verifyTOTP } from 'otplib';

const ChallengInitiateSchema = z.object({
  method: z.enum(['totp', 'backup_code']).optional().default('totp'),
});

const TOTPVerifySchema = z.object({
  code: z.string().length(6),
  trust_device: z.boolean().optional().default(false),
});

const BackupCodeSchema = z.object({
  code: z.string(),
  trust_device: z.boolean().optional().default(false),
});

export async function mfaChallengeRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/mfa/challenge
   * Initiate MFA challenge
   */
  fastify.post('/mfa/challenge', {
    schema: {
      description: 'Initiate MFA challenge',
      tags: ['mfa'],
      body: ChallengInitiateSchema,
      response: {
        200: z.object({
          challenge_id: z.string(),
          method: z.string(),
          expires_at: z.number(),
        }),
      },
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof ChallengInitiateSchema> }>,
    reply: FastifyReply
  ) => {
    const userId = request.user?.id;
    const sessionId = request.session?.id;
    const { method } = request.body;

    if (!userId || !sessionId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Generate challenge ID
      const challengeId = require('crypto').randomBytes(16).toString('hex');
      const expiresAt = Date.now() + 300000; // 5 minutes

      // Store challenge in Redis
      const redis = fastify.redis;
      const challengeKey = `mfa:challenge:${challengeId}`;
      await redis.setex(
        challengeKey,
        300,
        JSON.stringify({
          userId,
          sessionId,
          method,
          createdAt: Date.now(),
        })
      );

      request.log.info({ userId, sessionId, method }, 'MFA challenge initiated');

      return reply.send({
        challenge_id: challengeId,
        method,
        expires_at: expiresAt,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to initiate MFA challenge');
      return reply.code(500).send({ error: 'Failed to initiate challenge' });
    }
  });

  /**
   * POST /v1/mfa/verify
   * Verify TOTP code
   */
  fastify.post('/mfa/verify', {
    schema: {
      description: 'Verify TOTP code',
      tags: ['mfa'],
      body: TOTPVerifySchema,
      response: {
        200: z.object({
          success: z.boolean(),
          mfa_verified: z.boolean(),
          trusted_device_token: z.string().optional(),
        }),
      },
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof TOTPVerifySchema> }>,
    reply: FastifyReply
  ) => {
    const userId = request.user?.id;
    const sessionId = request.session?.id;
    const { code, trust_device } = request.body;

    if (!userId || !sessionId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Get user's TOTP secret
      const tenantDb = fastify.mongo.client.db(request.tenant?.id || 'default');
      const usersCollection = tenantDb.collection('users');

      const user = await usersCollection.findOne({ _id: userId } as any);

      if (!user || !user.mfa_secret) {
        return reply.code(400).send({ error: 'MFA not configured' });
      }

      // Verify TOTP code (otplib v13 async API)
      const result = await verifyTOTP({
        token: code,
        secret: user.mfa_secret,
      });
      const isValid = result.valid;

      if (!isValid) {
        request.log.warn({ userId, sessionId }, 'Invalid TOTP code');
        return reply.code(400).send({
          success: false,
          error: 'Invalid verification code',
        });
      }

      // Mark MFA as verified in session
      await fastify.mfaEnforcement.markMFAVerified(sessionId, request);

      // Register trusted device if requested
      let trustedDeviceToken;
      if (trust_device) {
        const policy = await fastify.mfaEnforcement.getTenantMFAPolicy(request, request.tenant?.id || '');
        const trustedDays = (policy?.config as any)?.trustedDeviceDays || 30;
        
        trustedDeviceToken = await fastify.mfaEnforcement.registerTrustedDevice(
          userId,
          (request.session as any)?.device_id || 'unknown',
          trustedDays,
          request,
          reply
        );
      }

      // Audit log
      await fastify.auditLogger.log({
        action: 'mfa_verified',
        actor_id: userId,
        resource_type: 'session',
        resource_id: sessionId,
        details: { method: 'totp', trust_device },
      });

      request.log.info({ userId, sessionId, trust_device }, 'MFA verified successfully');

      return reply.send({
        success: true,
        mfa_verified: true,
        trusted_device_token: trustedDeviceToken,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to verify TOTP code');
      return reply.code(500).send({ error: 'Verification failed' });
    }
  });

  /**
   * POST /v1/mfa/backup
   * Use backup code
   */
  fastify.post('/mfa/backup', {
    schema: {
      description: 'Use backup code',
      tags: ['mfa'],
      body: BackupCodeSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          mfa_verified: z.boolean(),
          remaining_codes: z.number(),
        }),
      },
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof BackupCodeSchema> }>,
    reply: FastifyReply
  ) => {
    const userId = request.user?.id;
    const sessionId = request.session?.id;
    const { code, trust_device } = request.body;

    if (!userId || !sessionId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Get user's backup codes
      const tenantDb = fastify.mongo.client.db(request.tenant?.id || 'default');
      const usersCollection = tenantDb.collection('users');

      const user = await usersCollection.findOne({ _id: userId } as any);

      if (!user || !user.mfa_backup_codes || user.mfa_backup_codes.length === 0) {
        return reply.code(400).send({ error: 'No backup codes available' });
      }

      // Find and verify backup code
      const codeIndex = user.mfa_backup_codes.findIndex(
        (bc: any) => bc.code === code && !bc.used
      );

      if (codeIndex === -1) {
        request.log.warn({ userId, sessionId }, 'Invalid or used backup code');
        return reply.code(400).send({
          success: false,
          error: 'Invalid or already used backup code',
        });
      }

      // Mark code as used
      await usersCollection.updateOne(
        { _id: userId } as any,
        {
          $set: {
            [`mfa_backup_codes.${codeIndex}.used`]: true,
            [`mfa_backup_codes.${codeIndex}.used_at`]: new Date(),
          },
        }
      );

      // Count remaining codes
      const remainingCodes = user.mfa_backup_codes.filter(
        (bc: any, idx: number) => !bc.used && idx !== codeIndex
      ).length;

      // Mark MFA as verified in session
      await fastify.mfaEnforcement.markMFAVerified(sessionId, request);

      // Register trusted device if requested
      if (trust_device) {
        const policy = await fastify.mfaEnforcement.getTenantMFAPolicy(request, request.tenant?.id || '');
        const trustedDays = (policy?.config as any)?.trustedDeviceDays || 30;
        
        await fastify.mfaEnforcement.registerTrustedDevice(
          userId,
          (request.session as any)?.device_id || 'unknown',
          trustedDays,
          request,
          reply
        );
      }

      // Audit log
      await fastify.auditLogger.log({
        action: 'mfa_verified',
        actor_id: userId,
        resource_type: 'session',
        resource_id: sessionId,
        details: { method: 'backup_code', remaining_codes: remainingCodes },
      });

      request.log.info({ userId, sessionId, remainingCodes }, 'MFA verified with backup code');

      return reply.send({
        success: true,
        mfa_verified: true,
        remaining_codes: remainingCodes,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to verify backup code');
      return reply.code(500).send({ error: 'Verification failed' });
    }
  });

  /**
   * GET /v1/mfa/status
   * Check MFA status for current session
   */
  fastify.get('/mfa/status', {
    schema: {
      description: 'Check MFA status',
      tags: ['mfa'],
      response: {
        200: z.object({
          mfa_required: z.boolean(),
          mfa_verified: z.boolean(),
          mfa_configured: z.boolean(),
          trusted_device: z.boolean(),
          methods_available: z.array(z.string()),
        }),
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    const tenantId = request.tenant?.id;

    if (!userId || !tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Check if MFA is required
      const mfaRequired = await fastify.mfaEnforcement.isMFARequired(request, tenantId || '', userId);

      // Check if MFA is verified in session
      const mfaVerified = request.session?.mfa_verified || false;

      // Check if user has MFA configured
      const tenantDb = fastify.mongo.client.db(tenantId || 'default');
      const usersCollection = tenantDb.collection('users');
      const user = await usersCollection.findOne({ _id: userId } as any);
      const mfaConfigured = !!(user?.mfa_secret);

      // Check if device is trusted
      const trustedDevice = await fastify.mfaEnforcement.checkTrustedDevice(request, userId || '');

      // Get available methods
      const methodsAvailable = [];
      if (user?.mfa_secret) methodsAvailable.push('totp');
      if (user?.mfa_backup_codes?.some((bc: any) => !bc.used)) methodsAvailable.push('backup_code');

      return reply.send({
        mfa_required: mfaRequired,
        mfa_verified: mfaVerified,
        mfa_configured: mfaConfigured,
        trusted_device: trustedDevice,
        methods_available: methodsAvailable,
      });
    } catch (error) {
      request.log.error({ error, userId }, 'Failed to check MFA status');
      return reply.code(500).send({ error: 'Failed to check status' });
    }
  });
}
