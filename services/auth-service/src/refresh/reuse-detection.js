"use strict";
/**
 * Refresh Token Reuse Detection
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Detects and handles refresh token reuse attacks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReuseDetector = void 0;
class ReuseDetector {
    tokenStore;
    familyTracker;
    constructor(tokenStore, familyTracker) {
        this.tokenStore = tokenStore;
        this.familyTracker = familyTracker;
    }
    /**
     * Detect if a refresh token is being reused
     */
    async detectReuse(token, tokenData) {
        // Check if token has already been used
        if (tokenData.used) {
            return {
                isReuse: true,
                action: 'revoke_family',
                reason: 'Token has already been used',
            };
        }
        // Check if token is revoked
        if (tokenData.revoked) {
            return {
                isReuse: true,
                action: 'revoke_family',
                reason: 'Token has been revoked',
            };
        }
        // Check if family is revoked
        const isFamilyRevoked = await this.familyTracker.isFamilyRevoked(tokenData.family_id);
        if (isFamilyRevoked) {
            return {
                isReuse: true,
                action: 'revoke_family',
                reason: 'Token family has been revoked',
            };
        }
        // No reuse detected
        return {
            isReuse: false,
            action: 'allow',
        };
    }
    /**
     * Handle detected reuse
     */
    async handleReuse(token, tokenData, reuseResult) {
        if (!reuseResult.isReuse) {
            return;
        }
        switch (reuseResult.action) {
            case 'revoke_family':
                await this.revokeFamilyAndAlert(tokenData, reuseResult.reason);
                break;
            case 'alert':
                await this.alertSecurityEvent(tokenData, reuseResult.reason);
                break;
        }
    }
    /**
     * Revoke entire token family and alert user
     */
    async revokeFamilyAndAlert(tokenData, reason) {
        // Revoke the family
        await this.familyTracker.revokeFamily(tokenData.family_id);
        // Revoke all user tokens in this family
        await this.tokenStore.revokeAllUserTokens(tokenData.user_id);
        // Log security event
        console.error('SECURITY: Refresh token reuse detected', {
            user_id: tokenData.user_id,
            family_id: tokenData.family_id,
            session_id: tokenData.session_id,
            reason,
            timestamp: new Date().toISOString(),
        });
        // TODO: Send alert to user (email/push notification)
        // TODO: Publish security event to Kafka
    }
    /**
     * Alert about security event without revoking
     */
    async alertSecurityEvent(tokenData, reason) {
        console.warn('SECURITY: Suspicious refresh token activity', {
            user_id: tokenData.user_id,
            family_id: tokenData.family_id,
            session_id: tokenData.session_id,
            reason,
            timestamp: new Date().toISOString(),
        });
        // TODO: Publish security event to Kafka
    }
    /**
     * Check for anomalous refresh patterns
     */
    async checkRefreshPattern(userId) {
        // Get user's token families
        const families = await this.familyTracker.getUserFamilies(userId);
        // Check for too many families (possible attack)
        if (families.length > 10) {
            return {
                suspicious: true,
                reason: 'Too many active token families',
            };
        }
        // Check for rapid family creation
        const recentFamilies = families.filter(f => Date.now() - f.created_at < 60 * 60 * 1000 // Last hour
        );
        if (recentFamilies.length > 5) {
            return {
                suspicious: true,
                reason: 'Rapid token family creation',
            };
        }
        return { suspicious: false };
    }
    /**
     * Validate token chain integrity
     */
    async validateTokenChain(tokenData) {
        // If this is the first token in the family, it's valid
        if (!tokenData.parent_id) {
            return true;
        }
        // Check if parent token exists in the family
        const isParentInFamily = await this.familyTracker.isTokenInFamily(tokenData.family_id, tokenData.parent_id);
        return isParentInFamily;
    }
    /**
     * Get reuse statistics
     */
    async getReuseStats() {
        const stats = await this.familyTracker.getFamilyStats();
        return {
            totalFamilies: stats.totalFamilies,
            revokedFamilies: stats.revokedFamilies,
            reuseDetectionRate: stats.totalFamilies > 0
                ? stats.revokedFamilies / stats.totalFamilies
                : 0,
        };
    }
}
exports.ReuseDetector = ReuseDetector;
//# sourceMappingURL=reuse-detection.js.map
