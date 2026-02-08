/**
 * Refresh Token Reuse Detection
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Detects and handles refresh token reuse attacks
 */
import { RefreshTokenStore } from './refresh-token-store';
import { FamilyTracker } from './family-tracker';
import { RefreshTokenData } from './types';
export interface ReuseDetectionResult {
    isReuse: boolean;
    action: 'allow' | 'revoke_family' | 'alert';
    reason?: string;
}
export declare class ReuseDetector {
    private tokenStore;
    private familyTracker;
    constructor(tokenStore: RefreshTokenStore, familyTracker: FamilyTracker);
    /**
     * Detect if a refresh token is being reused
     */
    detectReuse(token: string, tokenData: RefreshTokenData): Promise<ReuseDetectionResult>;
    /**
     * Handle detected reuse
     */
    handleReuse(token: string, tokenData: RefreshTokenData, reuseResult: ReuseDetectionResult): Promise<void>;
    /**
     * Revoke entire token family and alert user
     */
    private revokeFamilyAndAlert;
    /**
     * Alert about security event without revoking
     */
    private alertSecurityEvent;
    /**
     * Check for anomalous refresh patterns
     */
    checkRefreshPattern(userId: string): Promise<{
        suspicious: boolean;
        reason?: string;
    }>;
    /**
     * Validate token chain integrity
     */
    validateTokenChain(tokenData: RefreshTokenData): Promise<boolean>;
    /**
     * Get reuse statistics
     */
    getReuseStats(): Promise<{
        totalFamilies: number;
        revokedFamilies: number;
        reuseDetectionRate: number;
    }>;
}
