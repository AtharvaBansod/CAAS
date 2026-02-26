"use strict";
/**
 * Revocation Store
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Manages multiple revocation list strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationStore = void 0;
class RevocationStore {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    /**
     * Revoke individual token by JTI
     */
    async revokeToken(jti, ttlSeconds) {
        const key = `revoked:${jti}`;
        await this.redis.setex(key, ttlSeconds, '1');
    }
    /**
     * Check if token is revoked
     */
    async isTokenRevoked(jti) {
        const key = `revoked:${jti}`;
        return (await this.redis.exists(key)) === 1;
    }
    /**
     * Revoke all user tokens issued before timestamp
     */
    async revokeUserTokensBefore(userId, timestamp) {
        const key = `user_tokens_invalid_before:${userId}`;
        // Store for 30 days
        await this.redis.setex(key, 30 * 24 * 60 * 60, timestamp.toString());
    }
    /**
     * Check if user tokens are revoked
     */
    async areUserTokensRevoked(userId, tokenIssuedAt) {
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
    async revokeSessionTokens(sessionId, ttlSeconds) {
        const key = `session_invalid:${sessionId}`;
        await this.redis.setex(key, ttlSeconds, '1');
    }
    /**
     * Check if session tokens are revoked
     */
    async areSessionTokensRevoked(sessionId) {
        const key = `session_invalid:${sessionId}`;
        return (await this.redis.exists(key)) === 1;
    }
    /**
     * Revoke all tenant tokens issued before timestamp
     */
    async revokeTenantTokensBefore(tenantId, timestamp) {
        const key = `tenant_tokens_invalid_before:${tenantId}`;
        // Store for 30 days
        await this.redis.setex(key, 30 * 24 * 60 * 60, timestamp.toString());
    }
    /**
     * Check if tenant tokens are revoked
     */
    async areTenantTokensRevoked(tenantId, tokenIssuedAt) {
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
    async clearUserRevocation(userId) {
        const key = `user_tokens_invalid_before:${userId}`;
        await this.redis.del(key);
    }
    /**
     * Clear session revocation
     */
    async clearSessionRevocation(sessionId) {
        const key = `session_invalid:${sessionId}`;
        await this.redis.del(key);
    }
    /**
     * Get revocation statistics
     */
    async getStats() {
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
    async cleanup() {
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
exports.RevocationStore = RevocationStore;
//# sourceMappingURL=revocation-store.js.map
