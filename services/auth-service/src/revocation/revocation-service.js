"use strict";
/**
 * Revocation Service
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Comprehensive token revocation supporting individual tokens,
 * user-wide, session-wide, and tenant-wide revocation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationService = void 0;
class RevocationService {
    store;
    eventPublisher;
    constructor(store, eventPublisher) {
        this.store = store;
        this.eventPublisher = eventPublisher;
    }
    /**
     * Revoke individual token
     */
    async revokeToken(tokenId, userId, ttlSeconds, reason, metadata) {
        // Revoke in store
        await this.store.revokeToken(tokenId, ttlSeconds);
        // Publish event
        await this.eventPublisher.publishTokenRevoked(tokenId, userId, reason, metadata);
        return {
            success: true,
            revoked_count: 1,
            reason,
            timestamp: Date.now(),
        };
    }
    /**
     * Revoke all user tokens
     */
    async revokeUserTokens(userId, reason, metadata) {
        const timestamp = Math.floor(Date.now() / 1000);
        // Revoke all tokens issued before now
        await this.store.revokeUserTokensBefore(userId, timestamp);
        // Publish event
        await this.eventPublisher.publishUserTokensRevoked(userId, reason, metadata);
        return {
            success: true,
            revoked_count: -1, // Unknown count
            reason,
            timestamp: Date.now(),
        };
    }
    /**
     * Revoke all session tokens
     */
    async revokeSessionTokens(sessionId, userId, ttlSeconds, reason, metadata) {
        // Revoke session
        await this.store.revokeSessionTokens(sessionId, ttlSeconds);
        // Publish event
        await this.eventPublisher.publishSessionTerminated(sessionId, userId, reason, metadata);
        return {
            success: true,
            revoked_count: -1, // Unknown count
            reason,
            timestamp: Date.now(),
        };
    }
    /**
     * Revoke all tenant tokens
     */
    async revokeTenantTokens(tenantId, reason, metadata) {
        const timestamp = Math.floor(Date.now() / 1000);
        // Revoke all tenant tokens issued before now
        await this.store.revokeTenantTokensBefore(tenantId, timestamp);
        // Publish event
        await this.eventPublisher.publishTenantTokensRevoked(tenantId, reason, metadata);
        return {
            success: true,
            revoked_count: -1, // Unknown count
            reason,
            timestamp: Date.now(),
        };
    }
    /**
     * Check if token is revoked
     */
    async isRevoked(tokenId, userId, sessionId, tenantId, issuedAt) {
        // Check individual token revocation
        if (await this.store.isTokenRevoked(tokenId)) {
            return { revoked: true, reason: 'token_revoked' };
        }
        // Check user-wide revocation
        if (await this.store.areUserTokensRevoked(userId, issuedAt)) {
            return { revoked: true, reason: 'user_tokens_revoked' };
        }
        // Check session revocation
        if (await this.store.areSessionTokensRevoked(sessionId)) {
            return { revoked: true, reason: 'session_terminated' };
        }
        // Check tenant-wide revocation
        if (await this.store.areTenantTokensRevoked(tenantId, issuedAt)) {
            return { revoked: true, reason: 'tenant_tokens_revoked' };
        }
        return { revoked: false };
    }
    /**
     * Clear user revocation (restore access)
     */
    async clearUserRevocation(userId) {
        await this.store.clearUserRevocation(userId);
    }
    /**
     * Get revocation statistics
     */
    async getStats() {
        return await this.store.getStats();
    }
    /**
     * Cleanup expired revocations
     */
    async cleanup() {
        return await this.store.cleanup();
    }
}
exports.RevocationService = RevocationService;
//# sourceMappingURL=revocation-service.js.map