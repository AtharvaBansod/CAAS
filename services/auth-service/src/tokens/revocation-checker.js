"use strict";
/**
 * Token Revocation Checker
 * Phase 2 - Authentication - Task AUTH-002
 *
 * Checks if tokens are revoked using Redis-based revocation lists
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationChecker = void 0;
class RevocationChecker {
    redis;
    keyPrefix;
    constructor(config) {
        this.redis = config.redis;
        this.keyPrefix = config.keyPrefix || 'revoked:';
    }
    /**
     * Check if a specific token (by JTI) is revoked
     */
    async isTokenRevoked(jti) {
        const key = `${this.keyPrefix}${jti}`;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    /**
     * Check if all user tokens are revoked (user-wide revocation)
     */
    async areUserTokensRevoked(userId, tokenIssuedAt) {
        const key = `user_tokens_invalid_before:${userId}`;
        const invalidBeforeTimestamp = await this.redis.get(key);
        if (!invalidBeforeTimestamp) {
            return false;
        }
        const invalidBefore = parseInt(invalidBeforeTimestamp, 10);
        return tokenIssuedAt < invalidBefore;
    }
    /**
     * Check if session tokens are revoked (session-wide revocation)
     */
    async areSessionTokensRevoked(sessionId) {
        const key = `session_invalid:${sessionId}`;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    /**
     * Comprehensive revocation check
     */
    async isRevoked(jti, userId, sessionId, issuedAt) {
        // Check individual token revocation
        if (await this.isTokenRevoked(jti)) {
            return { revoked: true, reason: 'token_revoked' };
        }
        // Check user-wide revocation
        if (await this.areUserTokensRevoked(userId, issuedAt)) {
            return { revoked: true, reason: 'user_tokens_revoked' };
        }
        // Check session revocation
        if (await this.areSessionTokensRevoked(sessionId)) {
            return { revoked: true, reason: 'session_terminated' };
        }
        return { revoked: false };
    }
    /**
     * Revoke a specific token
     */
    async revokeToken(jti, ttlSeconds) {
        const key = `${this.keyPrefix}${jti}`;
        await this.redis.setex(key, ttlSeconds, '1');
    }
    /**
     * Revoke all user tokens issued before a timestamp
     */
    async revokeUserTokens(userId, beforeTimestamp) {
        const key = `user_tokens_invalid_before:${userId}`;
        // Set with a long TTL (e.g., 30 days)
        await this.redis.setex(key, 30 * 24 * 60 * 60, beforeTimestamp.toString());
    }
    /**
     * Revoke all session tokens
     */
    async revokeSessionTokens(sessionId, ttlSeconds) {
        const key = `session_invalid:${sessionId}`;
        await this.redis.setex(key, ttlSeconds, '1');
    }
    /**
     * Clear user revocation
     */
    async clearUserRevocation(userId) {
        const key = `user_tokens_invalid_before:${userId}`;
        await this.redis.del(key);
    }
    /**
     * Get revocation statistics
     */
    async getRevocationStats() {
        const [revokedTokens, revokedUsers, revokedSessions] = await Promise.all([
            this.redis.keys(`${this.keyPrefix}*`).then(keys => keys.length),
            this.redis.keys('user_tokens_invalid_before:*').then(keys => keys.length),
            this.redis.keys('session_invalid:*').then(keys => keys.length),
        ]);
        return {
            revokedTokens,
            revokedUsers,
            revokedSessions,
        };
    }
    /**
     * Cleanup expired revocations (manual trigger)
     */
    async cleanup() {
        // Redis TTL handles automatic cleanup
        // This method is for manual cleanup if needed
        let cleaned = 0;
        // Clean up expired token revocations
        const tokenKeys = await this.redis.keys(`${this.keyPrefix}*`);
        for (const key of tokenKeys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
                // No TTL set, remove it
                await this.redis.del(key);
                cleaned++;
            }
        }
        return cleaned;
    }
}
exports.RevocationChecker = RevocationChecker;
//# sourceMappingURL=revocation-checker.js.map