/**
 * Refresh Token Store
 * Phase 2 - Authentication - Task AUTH-003
 * 
 * Stores refresh tokens in Redis with hashing for security
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';
import { RefreshTokenData } from './types';

export class RefreshTokenStore {
  private redis: Redis;
  private keyPrefix: string;

  constructor(redis: Redis, keyPrefix: string = 'rt:') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Hash token for storage (never store plain tokens)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get Redis key for token
   */
  private getKey(tokenHash: string): string {
    return `${this.keyPrefix}${tokenHash}`;
  }

  /**
   * Get Redis key for user tokens index
   */
  private getUserTokensKey(userId: string): string {
    return `user_refresh_tokens:${userId}`;
  }

  /**
   * Store refresh token
   */
  async store(token: string, data: RefreshTokenData, ttlSeconds: number): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);

    // Store token data
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));

    // Add to user's token index
    const userTokensKey = this.getUserTokensKey(data.user_id);
    await this.redis.sadd(userTokensKey, tokenHash);
    await this.redis.expire(userTokensKey, ttlSeconds);
  }

  /**
   * Get refresh token data
   */
  async get(token: string): Promise<RefreshTokenData | null> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);

    const data = await this.redis.get(key);
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Mark token as used
   */
  async markAsUsed(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);

    const data = await this.get(token);
    if (!data) {
      return;
    }

    data.used = true;
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    }
  }

  /**
   * Revoke token
   */
  async revoke(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);

    const data = await this.get(token);
    if (!data) {
      return;
    }

    data.revoked = true;
    const ttl = await this.redis.ttl(key);
    if (ttl > 0) {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    }
  }

  /**
   * Delete token
   */
  async delete(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);

    const data = await this.get(token);
    if (data) {
      // Remove from user's token index
      const userTokensKey = this.getUserTokensKey(data.user_id);
      await this.redis.srem(userTokensKey, tokenHash);
    }

    await this.redis.del(key);
  }

  /**
   * Get all user's refresh tokens
   */
  async getUserTokens(userId: string): Promise<RefreshTokenData[]> {
    const userTokensKey = this.getUserTokensKey(userId);
    const tokenHashes = await this.redis.smembers(userTokensKey);

    const tokens: RefreshTokenData[] = [];
    for (const tokenHash of tokenHashes) {
      const key = this.getKey(tokenHash);
      const data = await this.redis.get(key);
      if (data) {
        tokens.push(JSON.parse(data));
      }
    }

    return tokens;
  }

  /**
   * Revoke all user's refresh tokens
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const userTokensKey = this.getUserTokensKey(userId);
    const tokenHashes = await this.redis.smembers(userTokensKey);

    let revokedCount = 0;
    for (const tokenHash of tokenHashes) {
      const key = this.getKey(tokenHash);
      const data = await this.redis.get(key);
      if (data) {
        const tokenData: RefreshTokenData = JSON.parse(data);
        tokenData.revoked = true;
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.setex(key, ttl, JSON.stringify(tokenData));
          revokedCount++;
        }
      }
    }

    return revokedCount;
  }

  /**
   * Delete all user's refresh tokens
   */
  async deleteAllUserTokens(userId: string): Promise<number> {
    const userTokensKey = this.getUserTokensKey(userId);
    const tokenHashes = await this.redis.smembers(userTokensKey);

    let deletedCount = 0;
    for (const tokenHash of tokenHashes) {
      const key = this.getKey(tokenHash);
      await this.redis.del(key);
      deletedCount++;
    }

    await this.redis.del(userTokensKey);
    return deletedCount;
  }

  /**
   * Get token count for user
   */
  async getUserTokenCount(userId: string): Promise<number> {
    const userTokensKey = this.getUserTokensKey(userId);
    return await this.redis.scard(userTokensKey);
  }

  /**
   * Check if token exists
   */
  async exists(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const key = this.getKey(tokenHash);
    return (await this.redis.exists(key)) === 1;
  }
}
