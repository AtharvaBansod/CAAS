import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('SlidingWindow');

export interface SpamResult {
  allowed: boolean;
  remaining: number;
  reset_at: Date;
  retry_after_ms?: number;
}

/**
 * Redis-based sliding window rate limiter
 * Uses sorted sets to track requests within time windows
 */
export class SpamDetector {
  constructor(
    private redisClient: RedisClientType,
    private keyPrefix: string = 'ratelimit'
  ) {}

  /**
   * Check if an action is allowed under the rate limit
   * @param key - Unique identifier for the rate limit (e.g., user:123:message)
   * @param limit - Maximum number of actions allowed
   * @param windowMs - Time window in milliseconds
   * @param cost - Cost of this action (default 1)
   */
  async checkLimit(
    key: string,
    limit: number,
    windowMs: number,
    cost: number = 1
  ): Promise<SpamResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `${this.keyPrefix}:${key}`;

    try {
      // Remove old entries outside the window
      await this.redisClient.zRemRangeByScore(redisKey, 0, windowStart);

      // Count current entries in the window
      const currentCount = await this.redisClient.zCard(redisKey);

      // Calculate remaining capacity
      const remaining = Math.max(0, limit - currentCount - cost);

      // Check if limit would be exceeded
      if (currentCount + cost > limit) {
        // Get the oldest entry to calculate retry time
        const oldestEntries = await this.redisClient.zRange(redisKey, 0, 0);

        let retryAfterMs = windowMs;
        if (oldestEntries.length > 0) {
          const oldestTimestamp = parseFloat(oldestEntries[0]);
          retryAfterMs = Math.max(0, oldestTimestamp + windowMs - now);
        }

        const resetAt = new Date(now + retryAfterMs);

        logger.debug(
          `Rate limit exceeded for ${key}: ${currentCount}/${limit} in ${windowMs}ms window`
        );

        return {
          allowed: false,
          remaining: 0,
          reset_at: resetAt,
          retry_after_ms: Math.ceil(retryAfterMs),
        };
      }

      // Add current request(s) to the window
      const pipeline = this.redisClient.multi();
      for (let i = 0; i < cost; i++) {
        // Use unique scores to avoid collisions
        const score = now + i * 0.001;
        pipeline.zAdd(redisKey, { score, value: `${score}` });
      }
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
      await pipeline.exec();

      const resetAt = new Date(now + windowMs);

      logger.debug(
        `Rate limit check passed for ${key}: ${currentCount + cost}/${limit} in ${windowMs}ms window`
      );

      return {
        allowed: true,
        remaining,
        reset_at: resetAt,
      };
    } catch (error: any) {
      logger.error(`Rate limit check failed for ${key}: ${error.message}`);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        remaining: limit,
        reset_at: new Date(now + windowMs),
      };
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: string): Promise<void> {
    const redisKey = `${this.keyPrefix}:${key}`;
    try {
      await this.redisClient.del(redisKey);
      logger.debug(`Rate limit reset for ${key}`);
    } catch (error: any) {
      logger.error(`Failed to reset rate limit for ${key}: ${error.message}`);
    }
  }

  /**
   * Get current count for a key
   */
  async getCount(key: string): Promise<number> {
    const now = Date.now();
    const redisKey = `${this.keyPrefix}:${key}`;
    
    try {
      const count = await this.redisClient.zCard(redisKey);
      return count;
    } catch (error: any) {
      logger.error(`Failed to get count for ${key}: ${error.message}`);
      return 0;
    }
  }
}

