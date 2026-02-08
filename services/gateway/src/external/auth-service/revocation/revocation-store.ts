/**
 * Revocation Store
 * Phase 2 - Authentication - Task AUTH-004
 * 
 * Manages multiple revocation list strategies
 */

import Redis from 'ioredis';

export class RevocationStore {
  constructor(private redis: Redis) {}

  /**
   * Revoke individual token by JTI
   */
  async revokeToken(jti: string, ttlSeconds: number): Promise<void> {
    const key = `revoked:${jti}`;
    await this.redis.setex(key, ttlSeconds, '1');
  }

  /**
   * Check if token is revoked
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    const key = `revoked:${jti}`;
    return (await this.redis.exists(key)) === 1;
  }

  /**
   * Revoke all user tokens issued before timestamp
   */
  async revokeUserTokensBefore(userId: string, timestamp: number): Promise<void> {
    const key = `user_tokens_invalid_before:${userId}`;
    // Store for 30 days
    await this.redis.setex(key, 30 * 24 * 60 * 60, timestamp.toString());
  }

  /**
   * Check if user tokens are revoked
   */
  async areUserTokensRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const key = `user_tokens_invalid_before:${userId}`;
    const invalidBefore = await this.redis.get(key);

    if (!invalidBefore) {
      return false;
    }

    return tokenIssuedAt < parseInt(invalidBefore, 10);
  }

  /**
   * Revoke all session tokens
   */
  async revokeSessionTokens(sessionId: string, ttlSeconds: number): Promise<void> {
    const key = `session_invalid:${sessionId}`;
    await this.redis.setex(key, ttlSeconds, '1');
  }

  /**
   * Check if session tokens are revoked
   */
  async areSessionTokensRevoked(sessionId: string): Promise<boolean> {
    const key = `session_invalid:${sessionId}`;
    return (await this.redis.exists(key)) === 1;
  }

  /**
   * Revoke all tenant tokens issued before timestamp
   */
  async revokeTenantTokensBefore(tenantId: string, timestamp: number): Promise<void> {
    const key = `tenant_tokens_invalid_before:${tenantId}`;
    // Store for 30 days
    await this.redis.setex(key, 30 * 24 * 60 * 60, timestamp.toString());
  }

  /**
   * Check if tenant tokens are revoked
   */
  async areTenantTokensRevoked(tenantId: string, tokenIssuedAt: number): Promise<boolean> {
    const key = `tenant_tokens_invalid_before:${tenantId}`;
    const invalidBefore = await this.redis.get(key);

    if (!invalidBefore) {
      return false;
    }

    return tokenIssuedAt < parseInt(invalidBefore, 10);
  }

  /**
   * Clear user revocation
   */
  async clearUserRevocation(userId: string): Promise<void> {
    const key = `user_tokens_invalid_before:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Clear session revocation
   */
  async clearSessionRevocation(sessionId: string): Promise<void> {
    const key = `session_invalid:${sessionId}`;
    await this.redis.del(key);
  }

  /**
   * Get revocation statistics
   */
  async getStats(): Promise<{
    revokedTokens: number;
    revokedUsers: number;
    revokedSessions: number;
    revokedTenants: number;
  }> {
    const [revokedTokens, revokedUsers, revokedSessions, revokedTenants] = await Promise.all([
      this.redis.keys('revoked:*').then(keys => keys.length),
      this.redis.keys('user_tokens_invalid_before:*').then(keys => keys.length),
      this.redis.keys('session_invalid:*').then(keys => keys.length),
      this.redis.keys('tenant_tokens_invalid_before:*').then(keys => keys.length),
    ]);

    return {
      revokedTokens,
      revokedUsers,
      revokedSessions,
      revokedTenants,
    };
  }

  /**
   * Cleanup expired revocations
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    // Clean up token revocations without TTL
    const tokenKeys = await this.redis.keys('revoked:*');
    for (const key of tokenKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        await this.redis.del(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}
