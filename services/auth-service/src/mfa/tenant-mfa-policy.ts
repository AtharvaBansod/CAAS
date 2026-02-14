import { Logger } from 'pino';
import { Db } from 'mongodb';

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

interface UserMFAStatus {
  userId: string;
  mfaRequired: boolean;
  mfaConfigured: boolean;
  enforcementDate?: Date;
  isExempt: boolean;
  inGracePeriod: boolean;
}

export class TenantMFAPolicy {
  private db: Db;
  private logger: Logger;

  constructor(db: Db, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Evaluate if MFA is required for user
   */
  async evaluateMFARequirement(
    tenantId: string,
    userId: string,
    userRoles: string[] = []
  ): Promise<boolean> {
    try {
      // Get tenant policy
      const policy = await this.getTenantPolicy(tenantId);

      if (!policy) {
        return false; // No policy, MFA not required
      }

      // Check if user is exempt
      if (policy.config.exemptUsers.includes(userId)) {
        this.logger.debug({ tenantId, userId }, 'User exempt from MFA');
        return false;
      }

      // Check grace period
      const inGracePeriod = await this.checkGracePeriod(tenantId, userId);
      if (inGracePeriod) {
        this.logger.debug({ tenantId, userId }, 'User in MFA grace period');
        return false;
      }

      // Evaluate based on level
      switch (policy.config.level) {
        case MFARequirementLevel.REQUIRED:
          return true;

        case MFARequirementLevel.ADMIN_ONLY:
          return userRoles.includes('admin') || userRoles.includes('tenant_admin');

        case MFARequirementLevel.RECOMMENDED:
          // Check user preference
          const userPreference = await this.getUserMFAPreference(tenantId, userId);
          return userPreference?.enabled || false;

        case MFARequirementLevel.OPTIONAL:
        default:
          return false;
      }
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to evaluate MFA requirement');
      return false;
    }
  }

  /**
   * Get tenant MFA policy
   */
  async getTenantPolicy(tenantId: string): Promise<TenantMFAPolicy | null> {
    try {
      const collection = this.db.collection('saas_clients');
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
   * Check if user is in grace period
   */
  async checkGracePeriod(tenantId: string, userId: string): Promise<boolean> {
    try {
      const tenantDb = this.db.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      const user = await usersCollection.findOne({ _id: userId });

      if (!user || !user.mfa_enforcement_date) {
        return false;
      }

      // Check if enforcement date has passed
      const now = new Date();
      const enforcementDate = new Date(user.mfa_enforcement_date);

      return now < enforcementDate;
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to check grace period');
      return false;
    }
  }

  /**
   * Check if user is exempt from MFA
   */
  async isUserExempt(tenantId: string, userId: string): Promise<boolean> {
    try {
      const policy = await this.getTenantPolicy(tenantId);

      if (!policy) {
        return false;
      }

      return policy.config.exemptUsers.includes(userId);
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to check exemption');
      return false;
    }
  }

  /**
   * Get user MFA status
   */
  async getUserMFAStatus(tenantId: string, userId: string): Promise<UserMFAStatus> {
    try {
      const tenantDb = this.db.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      const user = await usersCollection.findOne({ _id: userId });
      const policy = await this.getTenantPolicy(tenantId);

      const isExempt = policy ? policy.config.exemptUsers.includes(userId) : false;
      const inGracePeriod = await this.checkGracePeriod(tenantId, userId);
      const mfaConfigured = !!(user?.mfa_secret);
      const mfaRequired = user?.mfa_required || false;

      return {
        userId,
        mfaRequired,
        mfaConfigured,
        enforcementDate: user?.mfa_enforcement_date,
        isExempt,
        inGracePeriod,
      };
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to get user MFA status');
      throw error;
    }
  }

  /**
   * Get user MFA preference
   */
  private async getUserMFAPreference(
    tenantId: string,
    userId: string
  ): Promise<{ enabled: boolean } | null> {
    try {
      const tenantDb = this.db.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      const user = await usersCollection.findOne({ _id: userId });

      if (!user || !user.mfa_preference) {
        return null;
      }

      return user.mfa_preference;
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to get user MFA preference');
      return null;
    }
  }

  /**
   * Set user MFA exemption
   */
  async setUserExemption(tenantId: string, userId: string, exempt: boolean): Promise<void> {
    try {
      const collection = this.db.collection('saas_clients');

      if (exempt) {
        await collection.updateOne(
          { _id: tenantId },
          { $addToSet: { 'mfa_config.exemptUsers': userId } }
        );
      } else {
        await collection.updateOne(
          { _id: tenantId },
          { $pull: { 'mfa_config.exemptUsers': userId } }
        );
      }

      this.logger.info({ tenantId, userId, exempt }, 'User MFA exemption updated');
    } catch (error) {
      this.logger.error({ error, tenantId, userId }, 'Failed to set user exemption');
      throw error;
    }
  }

  /**
   * Update tenant MFA policy
   */
  async updateTenantPolicy(tenantId: string, config: MFAConfig): Promise<void> {
    try {
      const collection = this.db.collection('saas_clients');

      await collection.updateOne(
        { _id: tenantId },
        {
          $set: {
            mfa_config: config,
            updated_at: new Date(),
          },
        }
      );

      this.logger.info({ tenantId, config }, 'Tenant MFA policy updated');
    } catch (error) {
      this.logger.error({ error, tenantId }, 'Failed to update tenant policy');
      throw error;
    }
  }
}
