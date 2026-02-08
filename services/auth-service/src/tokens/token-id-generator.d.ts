/**
 * Token ID Generator
 * Phase 2 - Authentication - Task AUTH-001
 *
 * Generates unique token IDs using UUID v7 (time-ordered)
 * with optional metadata encoding
 */
export declare class TokenIdGenerator {
    /**
     * Generate a unique token ID using UUID v7
     * UUID v7 is time-ordered which helps with:
     * - Database indexing
     * - Chronological sorting
     * - Debugging and tracing
     */
    static generate(): string;
    /**
     * Generate token ID with metadata prefix
     * Format: {prefix}_{uuid}
     * Example: at_550e8400-e29b-41d4-a716-446655440000 (access token)
     *          rt_550e8400-e29b-41d4-a716-446655440000 (refresh token)
     */
    static generateWithPrefix(prefix: string): string;
    /**
     * Generate access token ID
     */
    static generateAccessTokenId(): string;
    /**
     * Generate refresh token ID
     */
    static generateRefreshTokenId(): string;
    /**
     * Generate service token ID
     */
    static generateServiceTokenId(): string;
    /**
     * Extract prefix from token ID
     */
    static extractPrefix(tokenId: string): string | null;
    /**
     * Validate token ID format
     */
    static isValid(tokenId: string): boolean;
    /**
     * Get token type from ID
     */
    static getTokenType(tokenId: string): 'access' | 'refresh' | 'service' | 'unknown';
}
