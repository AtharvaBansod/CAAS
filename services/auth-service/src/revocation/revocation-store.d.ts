/**
 * Revocation Store
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Manages multiple revocation list strategies
 */
import Redis from 'ioredis';
export declare class RevocationStore {
    private redis;
    constructor(redis: Redis);
    /**
     * Revoke individual token by JTI
     */
    revokeToken(jti: string, ttlSeconds: number): Promise<void>;
    /**
     * Check if token is revoked
     */
    isTokenRevoked(jti: string): Promise<boolean>;
    /**
     * Revoke all user tokens issued before timestamp
     */
    revokeUserTokensBefore(userId: string, timestamp: number): Promise<void>;
    /**
     * Check if user tokens are revoked
     */
    areUserTokensRevoked(userId: string, tokenIssuedAt: number): Promise<boolean>;
    /**
     * Revoke all session tokens
     */
    revokeSessionTokens(sessionId: string, ttlSeconds: number): Promise<void>;
    /**
     * Check if session tokens are revoked
     */
    areSessionTokensRevoked(sessionId: string): Promise<boolean>;
    /**
     * Revoke all tenant tokens issued before timestamp
     */
    revokeTenantTokensBefore(tenantId: string, timestamp: number): Promise<void>;
    /**
     * Check if tenant tokens are revoked
     */
    areTenantTokensRevoked(tenantId: string, tokenIssuedAt: number): Promise<boolean>;
    /**
     * Clear user revocation
     */
    clearUserRevocation(userId: string): Promise<void>;
    /**
     * Clear session revocation
     */
    clearSessionRevocation(sessionId: string): Promise<void>;
    /**
     * Get revocation statistics
     */
    getStats(): Promise<{
        revokedTokens: number;
        revokedUsers: number;
        revokedSessions: number;
        revokedTenants: number;
    }>;
    /**
     * Cleanup expired revocations
     */
    cleanup(): Promise<number>;
}
