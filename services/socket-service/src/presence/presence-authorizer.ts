import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceAuthorizer');

export interface PresenceAuthorizationResult {
  allowed: boolean;
  reason?: string;
}

export class PresenceAuthorizer {
  private redis: RedisClientType;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  /**
   * Check if a user can view another user's presence
   */
  async canViewPresence(requesterId: string, targetUserIds: string[], tenantId: string): Promise<string[]> {
    try {
      const allowed: string[] = [];

      for (const targetUserId of targetUserIds) {
        // Same user can always see their own presence
        if (requesterId === targetUserId) {
          allowed.push(targetUserId);
          continue;
        }

        // Check if users are in the same tenant
        const sameTenant = await this.areSameTenant(requesterId, targetUserId, tenantId);
        if (!sameTenant) {
          logger.debug(`User ${requesterId} cannot view ${targetUserId} - different tenant`);
          continue;
        }

        // Check if target user has blocked requester
        const isBlocked = await this.isBlocked(targetUserId, requesterId);
        if (isBlocked) {
          logger.debug(`User ${requesterId} cannot view ${targetUserId} - blocked`);
          continue;
        }

        // Check privacy settings
        const privacyAllowed = await this.checkPrivacySettings(requesterId, targetUserId);
        if (!privacyAllowed) {
          logger.debug(`User ${requesterId} cannot view ${targetUserId} - privacy settings`);
          continue;
        }

        allowed.push(targetUserId);
      }

      return allowed;
    } catch (error: any) {
      logger.error('Error checking presence authorization', error);
      return [];
    }
  }

  /**
   * Check if two users are in the same tenant
   */
  private async areSameTenant(userId1: string, userId2: string, tenantId: string): Promise<boolean> {
    // In a real implementation, this would check the database
    // For now, we assume all users in the same request are in the same tenant
    return true;
  }

  /**
   * Check if a user has blocked another user
   */
  private async isBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    try {
      const blockKey = `user:${userId}:blocked`;
      return await this.redis.sIsMember(blockKey, blockedUserId);
    } catch (error: any) {
      logger.error('Error checking block status', error);
      return false;
    }
  }

  /**
   * Check privacy settings for presence visibility
   */
  private async checkPrivacySettings(requesterId: string, targetUserId: string): Promise<boolean> {
    try {
      // Get target user's privacy settings
      const privacyKey = `user:${targetUserId}:privacy:presence`;
      const privacySetting = await this.redis.get(privacyKey);

      // Default to 'everyone' if not set
      if (!privacySetting || privacySetting === 'everyone') {
        return true;
      }

      // If set to 'nobody', deny
      if (privacySetting === 'nobody') {
        return false;
      }

      // If set to 'contacts', check if they are contacts
      if (privacySetting === 'contacts') {
        return await this.areContacts(requesterId, targetUserId);
      }

      return true;
    } catch (error: any) {
      logger.error('Error checking privacy settings', error);
      return true; // Default to allowing
    }
  }

  /**
   * Check if two users are contacts
   */
  private async areContacts(userId1: string, userId2: string): Promise<boolean> {
    try {
      const contactsKey = `user:${userId1}:contacts`;
      return await this.redis.sIsMember(contactsKey, userId2);
    } catch (error: any) {
      logger.error('Error checking contact status', error);
      return false;
    }
  }

  /**
   * Check if a user can subscribe to presence updates
   */
  async canSubscribeToPresence(subscriberId: string, targetUserIds: string[], tenantId: string): Promise<string[]> {
    // Same logic as canViewPresence for now
    return this.canViewPresence(subscriberId, targetUserIds, tenantId);
  }
}
