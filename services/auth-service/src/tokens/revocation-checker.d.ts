/**
 * Token Revocation Checker
 * Phase 2 - Authentication - Task AUTH-002
 *
 * Checks if tokens are revoked using Redis-based revocation lists
 */
import Redis from 'ioredis';
export interface RevocationCheckerConfig {
    redis: Redis;
    keyPrefix: string;
}
export declare class RevocationChecker {
    private redis;
    private keyPrefix;
    constructor(config: RevocationCheckerConfig);
    /**
     * Check if a specific token (by JTI) is revoked
     */
    isTokenRevoked(jti: string): Promise<boolean>;
    /**
     * Check if all user tokens are revoked (user-wide revocation)
     */
    areUserTokensRevoked(userId: string, tokenIssuedAt: number): Promise<boolean>;
    /**
     * Check if session tokens are revoked (session-wide revocation)
     */
    areSessionTokensRevoked(sessionId: string): Promise<boolean>;
    /**
     * Comprehensive revocation check
     */
    isRevoked(jti: string, userId: string, sessionId: string, issuedAt: number): Promise<{
        revoked: boolean;
        reason?: string;
    }>;
    /**
     * Revoke a specific token
     */
    revokeToken(jti: string, ttlSeconds: number): Promise<void>;
    /**
     * Revoke all user tokens issued before a timestamp
     */
    revokeUserTokens(userId: string, beforeTimestamp: number): Promise<void>;
    /**
     * Revoke all session tokens
     */
    revokeSessionTokens(sessionId: string, ttlSeconds: number): Promise<void>;
    /**
     * Clear user revocation
     */
    clearUserRevocation(userId: string): Promise<void>;
    /**
     * Get revocation statistics
     */
    getRevocationStats(): Promise<{
        revokedTokens: number;
        revokedUsers: number;
        revokedSessions: number;
    }>;
    /**
     * Cleanup expired revocations (manual trigger)
     */
    cleanup(): Promise<number>;
}
