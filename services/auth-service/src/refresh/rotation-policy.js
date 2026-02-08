"use strict";
/**
 * Refresh Token Rotation Policy
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Implements token rotation strategies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenRotationPolicy = void 0;
exports.createDefaultRotationPolicy = createDefaultRotationPolicy;
class TokenRotationPolicy {
    policy;
    constructor(policy) {
        this.policy = policy;
    }
    /**
     * Check if rotation is enabled
     */
    isRotationEnabled() {
        return this.policy.enabled;
    }
    /**
     * Check if reuse detection is enabled
     */
    isReuseDetectionEnabled() {
        return this.policy.reuseDetection;
    }
    /**
     * Check if family revocation is enabled on reuse
     */
    shouldRevokeFamilyOnReuse() {
        return this.policy.revokeFamily;
    }
    /**
     * Determine if token should be rotated
     */
    shouldRotate(tokenAge, lastUsed) {
        if (!this.policy.enabled) {
            return false;
        }
        // Always rotate on use when rotation is enabled
        return true;
    }
    /**
     * Get rotation strategy
     */
    getRotationStrategy() {
        if (!this.policy.enabled) {
            return 'never';
        }
        // Currently always rotate when enabled
        // Can be extended to support conditional rotation
        return 'always';
    }
    /**
     * Validate rotation policy configuration
     */
    validate() {
        if (this.policy.revokeFamily && !this.policy.reuseDetection) {
            throw new Error('Cannot revoke family on reuse without reuse detection enabled');
        }
    }
    /**
     * Get policy configuration
     */
    getPolicy() {
        return { ...this.policy };
    }
    /**
     * Update policy
     */
    updatePolicy(updates) {
        this.policy = { ...this.policy, ...updates };
        this.validate();
    }
}
exports.TokenRotationPolicy = TokenRotationPolicy;
/**
 * Create default rotation policy
 */
function createDefaultRotationPolicy() {
    const policy = {
        enabled: process.env.REFRESH_TOKEN_ROTATION !== 'false',
        reuseDetection: process.env.REFRESH_TOKEN_REUSE_DETECTION !== 'false',
        revokeFamily: true,
    };
    return new TokenRotationPolicy(policy);
}
//# sourceMappingURL=rotation-policy.js.map