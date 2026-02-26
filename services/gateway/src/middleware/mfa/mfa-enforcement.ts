import { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from 'pino';

export enum MFARequirementLevel {
  OPTIONAL = 'OPTIONAL',
  RECOMMENDED = 'RECOMMENDED',
  REQUIRED = 'REQUIRED',
  ADMIN_ONLY = 'ADMIN_ONLY',
}

interface MFAConfig {
  level: MFARequirementLevel;
  methods: string[];
  trustedDeviceDays: number;
  gracePeriodDays: number;
  exemptUsers: string[];
}

interface TenantMFAPolicy {
  tenantId: string;
  config: MFAConfig;
}

export class MFAEnforcement {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Middleware to enforce MFA requirements
   */
  async enforce(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const userId = request.user?.id;
    const tenantId = request.tenant?.id;
    const sessionId = request.session?.id;

    if (!userId || !tenantId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Check if MFA is required for this tenant/user
      const mfaRequired = await this.isMFARequired(request, tenantId, userId);

      if (!mfaRequired) {
        // MFA not required, continue
        return;
      }

      // Check if MFA has been verified in this session
      const mfaVerified = request.session?.mfa_verified || false;

      if (mfaVerified) {
        // MFA already verified, continue
        return;
      }

      // Check if device is trusted
      const isTrustedDevice = await this.checkTrustedDevice(request, userId);

      if (isTrustedDevice) {
        // Trusted device, bypass MFA
        this.logger.info({ userId, sessionId }, 'MFA bypassed for trusted device');
        return;
      }

      // MFA required but not verified - challenge needed
      return reply.code(403).send({
        error: 'MFA verification required',
        mfa_challenge_required: true,
        challenge_url: '/v1/mfa/challenge',
      });
    } catch (error) {
      this.logger.error({ error, userId, tenantId }, 'MFA enforcement check failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  }

  /**
   * Check if MFA is required for tenant and user (public for external use)
   */
  async isMFARequired(
    request: FastifyRequest | any,
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get tenant MFA policy
      const policy = await this.getTenantMFAPolicy(request, tenantId);

      if (!policy) {
        return false; // No policy, MFA not required
      }

      // Check exemptions
      if (policy.config.exemptUsers.includes(userId)) {
        this.logger.debug({ userId, tenantId }, 'User exempt from MFA');
        return false;
      }

      // Check requirement level
      switch (policy.config.level) {
        case MFARequirementLevel.REQUIRED:
          return true;

        case MFARequirementLevel.ADMIN_ONLY:
          // Check if user is admin
          const isAdmin = request.user?.roles?.includes('admin') || false;
          return isAdmin;

        case MFARequirementLevel.RECOMMENDED:
          // Check user preference
          const userPreference = await this.getUserMFAPreference(request, userId);
          return userPreference?.enabled || false;

        case MFARequirementLevel.OPTIONAL:
        default:
          return false;
      }
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to check MFA requirement');
      return false;
    }
  }

  /**
   * Check if device is trusted (public for external use)
   */
  async checkTrustedDevice(
    request: FastifyRequest | any,
    userId: string
  ): Promise<boolean> {
    try {
      // Check for trusted device cookie/token
      const trustedDeviceToken = request.cookies?.trusted_device;

      if (!trustedDeviceToken) {
        return false;
      }

      // Verify trusted device token
      const redis = (request.server as any).redis;
      const key = `trusted_device:${userId}:${trustedDeviceToken}`;
      const exists = await redis.exists(key);

      return exists === 1;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to check trusted device');
      return false;
    }
  }

  /**
   * Get tenant MFA policy (public for external use)
   */
  async getTenantMFAPolicy(
    request: FastifyRequest | any,
    tenantId: string
  ): Promise<TenantMFAPolicy | null> {
    try {
      const db = (request.server as any).mongo.db;
      const collection = db.collection('clients');

      const tenant = await collection.findOne({ _id: tenantId });

      if (!tenant || !tenant.mfa_config) {
        return null;
      }

      return {
        tenantId,
        config: tenant.mfa_config,
      };
    } catch (error) {
      this.logger.error({ error, tenantId }, 'Failed to get tenant MFA policy');
      return null;
    }
  }

  /**
   * Get user MFA preference
   */
  private async getUserMFAPreference(
    request: FastifyRequest,
    userId: string
  ): Promise<{ enabled: boolean } | null> {
    try {
      const db = (request.server as any).mongo.db;
      const tenantDb = db.db(request.tenant?.id);
      const collection = tenantDb.collection('users');

      const user = await collection.findOne({ _id: userId });

      if (!user || !user.mfa_preference) {
        return null;
      }

      return user.mfa_preference;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user MFA preference');
      return null;
    }
  }

  /**
   * Mark MFA as verified in session
   */
  async markMFAVerified(sessionId: string, request: FastifyRequest): Promise<void> {
    try {
      const sessionStore = (request.server as any).sessionStore;
      await sessionStore.update(sessionId, { mfa_verified: true });

      this.logger.info({ sessionId }, 'MFA marked as verified');
    } catch (error) {
      this.logger.error({ error, sessionId }, 'Failed to mark MFA as verified');
      throw error;
    }
  }

  /**
   * Register trusted device
   */
  async registerTrustedDevice(
    userId: string,
    deviceId: string,
    trustedDays: number,
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<string> {
    try {
      const redis = (request.server as any).redis;
      const token = this.generateTrustedDeviceToken();
      const key = `trusted_device:${userId}:${token}`;

      // Store trusted device token
      await redis.setex(key, trustedDays * 86400, JSON.stringify({ deviceId, userId }));

      // Set cookie
      reply.setCookie('trusted_device', token, {
        maxAge: trustedDays * 86400,
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });

      this.logger.info({ userId, deviceId }, 'Trusted device registered');
      return token;
    } catch (error) {
      this.logger.error({ error, userId, deviceId }, 'Failed to register trusted device');
      throw error;
    }
  }

  /**
   * Generate trusted device token
   */
  private generateTrustedDeviceToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

/**
 * Fastify plugin for MFA enforcement
 */
export async function mfaEnforcementPlugin(fastify: any) {
  const mfaEnforcement = new MFAEnforcement(fastify.log);

  fastify.decorate('mfaEnforcement', mfaEnforcement);

  fastify.decorate('requireMFA', async (request: FastifyRequest, reply: FastifyReply) => {
    await mfaEnforcement.enforce(request, reply);
  });
}
