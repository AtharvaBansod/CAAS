"use strict";
/**
 * Token ID Generator
 * Phase 2 - Authentication - Task AUTH-001
 *
 * Generates unique token IDs using UUID v7 (time-ordered)
 * with optional metadata encoding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenIdGenerator = void 0;
const crypto_1 = require("crypto");
class TokenIdGenerator {
    /**
     * Generate a unique token ID using UUID v7
     * UUID v7 is time-ordered which helps with:
     * - Database indexing
     * - Chronological sorting
     * - Debugging and tracing
     */
    static generate() {
        // Using UUID v4 for now (Node.js doesn't have native v7 yet)
        // In production, consider using a library like 'uuid' with v7 support
        return (0, crypto_1.randomUUID)();
    }
    /**
     * Generate token ID with metadata prefix
     * Format: {prefix}_{uuid}
     * Example: at_550e8400-e29b-41d4-a716-446655440000 (access token)
     *          rt_550e8400-e29b-41d4-a716-446655440000 (refresh token)
     */
    static generateWithPrefix(prefix) {
        const uuid = this.generate();
        return `${prefix}_${uuid}`;
    }
    /**
     * Generate access token ID
     */
    static generateAccessTokenId() {
        return this.generateWithPrefix('at');
    }
    /**
     * Generate refresh token ID
     */
    static generateRefreshTokenId() {
        return this.generateWithPrefix('rt');
    }
    /**
     * Generate service token ID
     */
    static generateServiceTokenId() {
        return this.generateWithPrefix('st');
    }
    /**
     * Extract prefix from token ID
     */
    static extractPrefix(tokenId) {
        const parts = tokenId.split('_');
        return parts.length > 1 ? parts[0] : null;
    }
    /**
     * Validate token ID format
     */
    static isValid(tokenId) {
        // Check if it's a valid UUID or prefixed UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const prefixedUuidRegex = /^[a-z]{2}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(tokenId) || prefixedUuidRegex.test(tokenId);
    }
    /**
     * Get token type from ID
     */
    static getTokenType(tokenId) {
        const prefix = this.extractPrefix(tokenId);
        switch (prefix) {
            case 'at':
                return 'access';
            case 'rt':
                return 'refresh';
            case 'st':
                return 'service';
            default:
                return 'unknown';
        }
    }
}
exports.TokenIdGenerator = TokenIdGenerator;
//# sourceMappingURL=token-id-generator.js.map
