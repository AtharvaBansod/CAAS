import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceSubscriber');

export interface PresenceSubscription {
  subscriber_id: string;
  target_user_ids: string[];
  subscribed_at: Date;
}

export class PresenceSubscriber {
  private redis: RedisClientType;
  private readonly SUBSCRIPTION_PREFIX = 'presence:subscriptions';
  private readonly SUBSCRIBER_PREFIX = 'presence:subscribers';
  private readonly MAX_SUBSCRIPTIONS = 1000;

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  /**
   * Subscribe to presence updates for specific users
   */
  async subscribe(subscriberId: string, targetUserIds: string[]): Promise<void> {
    try {
      // Check subscription limit
      const currentCount = await this.getSubscriptionCount(subscriberId);
      if (currentCount + targetUserIds.length > this.MAX_SUBSCRIPTIONS) {
        throw new Error(`Subscription limit exceeded. Max: ${this.MAX_SUBSCRIPTIONS}`);
      }

      // Add subscriptions (subscriber -> targets)
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      await this.redis.sAdd(subscriptionKey, targetUserIds);

      // Add reverse mapping (target -> subscribers)
      for (const targetUserId of targetUserIds) {
        const subscriberKey = `${this.SUBSCRIBER_PREFIX}:${targetUserId}`;
        await this.redis.sAdd(subscriberKey, subscriberId);
      }

      logger.info(`User ${subscriberId} subscribed to ${targetUserIds.length} users`);
    } catch (error: any) {
      logger.error('Error subscribing to presence', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from presence updates for specific users
   */
  async unsubscribe(subscriberId: string, targetUserIds: string[]): Promise<void> {
    try {
      // Remove subscriptions
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      await this.redis.sRem(subscriptionKey, targetUserIds);

      // Remove reverse mapping
      for (const targetUserId of targetUserIds) {
        const subscriberKey = `${this.SUBSCRIBER_PREFIX}:${targetUserId}`;
        await this.redis.sRem(subscriberKey, subscriberId);
      }

      logger.info(`User ${subscriberId} unsubscribed from ${targetUserIds.length} users`);
    } catch (error: any) {
      logger.error('Error unsubscribing from presence', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all presence updates
   */
  async unsubscribeAll(subscriberId: string): Promise<void> {
    try {
      // Get all current subscriptions
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      const targetUserIds = await this.redis.sMembers(subscriptionKey);

      if (targetUserIds.length > 0) {
        // Remove reverse mappings
        for (const targetUserId of targetUserIds) {
          const subscriberKey = `${this.SUBSCRIBER_PREFIX}:${targetUserId}`;
          await this.redis.sRem(subscriberKey, subscriberId);
        }

        // Remove subscription set
        await this.redis.del(subscriptionKey);
      }

      logger.info(`User ${subscriberId} unsubscribed from all presence`);
    } catch (error: any) {
      logger.error('Error unsubscribing from all presence', error);
      throw error;
    }
  }

  /**
   * Get all users a subscriber is subscribed to
   */
  async getSubscriptions(subscriberId: string): Promise<string[]> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      return await this.redis.sMembers(subscriptionKey);
    } catch (error: any) {
      logger.error('Error getting subscriptions', error);
      return [];
    }
  }

  /**
   * Get all subscribers for a target user
   */
  async getSubscribers(targetUserId: string): Promise<string[]> {
    try {
      const subscriberKey = `${this.SUBSCRIBER_PREFIX}:${targetUserId}`;
      return await this.redis.sMembers(subscriberKey);
    } catch (error: any) {
      logger.error('Error getting subscribers', error);
      return [];
    }
  }

  /**
   * Get subscription count for a user
   */
  async getSubscriptionCount(subscriberId: string): Promise<number> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      return await this.redis.sCard(subscriptionKey);
    } catch (error: any) {
      logger.error('Error getting subscription count', error);
      return 0;
    }
  }

  /**
   * Check if a user is subscribed to another user
   */
  async isSubscribed(subscriberId: string, targetUserId: string): Promise<boolean> {
    try {
      const subscriptionKey = `${this.SUBSCRIPTION_PREFIX}:${subscriberId}`;
      return await this.redis.sIsMember(subscriptionKey, targetUserId);
    } catch (error: any) {
      logger.error('Error checking subscription', error);
      return false;
    }
  }
}
