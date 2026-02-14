/**
 * Resume Token Store
 * 
 * Stores and retrieves change stream resume tokens in Redis
 */

import { Redis } from 'ioredis';
import { ResumeToken } from 'mongodb';

export class ResumeTokenStore {
  private redis?: Redis;
  private keyPrefix: string;
  private ttlSeconds: number;

  constructor(options: { keyPrefix?: string; ttlSeconds?: number } = {}) {
    this.keyPrefix = options.keyPrefix || 'changestream:token';
    this.ttlSeconds = options.ttlSeconds || 86400; // 24 hours default
  }

  /**
   * Set Redis client
   */
  setRedis(redis: Redis): void {
    this.redis = redis;
  }

  /**
   * Get cache key for stream
   */
  private getCacheKey(streamName: string): string {
    return `${this.keyPrefix}:${streamName}`;
  }

  /**
   * Store resume token
   */
  async storeToken(streamName: string, token: ResumeToken): Promise<void> {
    if (!this.redis) {
      console.warn('Redis not configured, resume token not stored');
      return;
    }

    try {
      const key = this.getCacheKey(streamName);
      const value = JSON.stringify(token);

      await this.redis.setex(key, this.ttlSeconds, value);
    } catch (error) {
      console.error(`Failed to store resume token for '${streamName}':`, error);
    }
  }

  /**
   * Get resume token
   */
  async getToken(streamName: string): Promise<ResumeToken | null> {
    if (!this.redis) {
      console.warn('Redis not configured, cannot retrieve resume token');
      return null;
    }

    try {
      const key = this.getCacheKey(streamName);
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      console.error(`Failed to get resume token for '${streamName}':`, error);
      return null;
    }
  }

  /**
   * Delete resume token
   */
  async deleteToken(streamName: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = this.getCacheKey(streamName);
      await this.redis.del(key);
    } catch (error) {
      console.error(`Failed to delete resume token for '${streamName}':`, error);
    }
  }

  /**
   * Check if token exists
   */
  async hasToken(streamName: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const key = this.getCacheKey(streamName);
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Failed to check resume token for '${streamName}':`, error);
      return false;
    }
  }
}
