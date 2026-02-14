/**
 * Conversation Membership Cache
 * 
 * Caches conversation membership checks in Redis for performance
 */

import { Redis } from 'ioredis';

export interface MembershipCheckResult {
  isMember: boolean;
  role?: string;
  cached: boolean;
}

export class ConversationMembershipCache {
  private redis: Redis;
  private ttlSeconds: number;
  private keyPrefix: string;

  constructor(redis: Redis, options: { ttlSeconds?: number; keyPrefix?: string } = {}) {
    this.redis = redis;
    this.ttlSeconds = options.ttlSeconds || 300; // 5 minutes default
    this.keyPrefix = options.keyPrefix || 'authz:membership';
  }

  /**
   * Get cache key for membership check
   */
  private getCacheKey(conversationId: string, userId: string): string {
    return `${this.keyPrefix}:${conversationId}:${userId}`;
  }

  /**
   * Check if user is member of conversation (with caching)
   */
  async isMember(
    conversationId: string,
    userId: string,
    checkFn: () => Promise<{ isMember: boolean; role?: string }>
  ): Promise<MembershipCheckResult> {
    const cacheKey = this.getCacheKey(conversationId, userId);

    try {
      // Try to get from cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return {
          isMember: data.isMember,
          role: data.role,
          cached: true,
        };
      }

      // Not in cache, check database
      const result = await checkFn();

      // Store in cache
      await this.redis.setex(
        cacheKey,
        this.ttlSeconds,
        JSON.stringify({
          isMember: result.isMember,
          role: result.role,
        })
      );

      return {
        ...result,
        cached: false,
      };
    } catch (error) {
      console.error('Membership cache error:', error);
      // On cache error, fall back to direct check
      const result = await checkFn();
      return {
        ...result,
        cached: false,
      };
    }
  }

  /**
   * Invalidate membership cache for a conversation
   */
  async invalidateConversation(conversationId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:${conversationId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to invalidate conversation cache:', error);
    }
  }

  /**
   * Invalidate membership cache for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:*:${userId}`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }
  }

  /**
   * Invalidate specific membership
   */
  async invalidate(conversationId: string, userId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(conversationId, userId);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Failed to invalidate membership cache:', error);
    }
  }

  /**
   * Clear all membership cache
   */
  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Failed to clear membership cache:', error);
    }
  }
}
