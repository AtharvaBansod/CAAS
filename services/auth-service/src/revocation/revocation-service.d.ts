/**
 * Revocation Service
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Comprehensive token revocation supporting individual tokens,
 * user-wide, session-wide, and tenant-wide revocation
 */
import { RevocationStore } from './revocation-store';
import { RevocationEventPublisher } from './revocation-events';
import { RevocationReason, RevocationResult } from './types';
export declare class RevocationService {
    private store;
    private eventPublisher;
    constructor(store: RevocationStore, eventPublisher: RevocationEventPublisher);
    /**
     * Revoke individual token
     */
    revokeToken(tokenId: string, userId: string, ttlSeconds: number, reason: RevocationReason, metadata?: Record<string, any>): Promise<RevocationResult>;
    /**
     * Revoke all user tokens
     */
    revokeUserTokens(userId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<RevocationResult>;
    /**
     * Revoke all session tokens
     */
    revokeSessionTokens(sessionId: string, userId: string, ttlSeconds: number, reason: RevocationReason, metadata?: Record<string, any>): Promise<RevocationResult>;
    /**
     * Revoke all tenant tokens
     */
    revokeTenantTokens(tenantId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<RevocationResult>;
    /**
     * Check if token is revoked
     */
    isRevoked(tokenId: string, userId: string, sessionId: string, tenantId: string, issuedAt: number): Promise<{
        revoked: boolean;
        reason?: string;
    }>;
    /**
     * Clear user revocation (restore access)
     */
    clearUserRevocation(userId: string): Promise<void>;
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
