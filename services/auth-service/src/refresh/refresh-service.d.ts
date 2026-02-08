/**
 * Refresh Service
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Handles token refresh with rotation and reuse detection
 */
import { JWTGenerator } from '../tokens/jwt-generator';
import { JWTValidator } from '../tokens/jwt-validator';
import { RefreshTokenStore } from './refresh-token-store';
import { FamilyTracker } from './family-tracker';
import { ReuseDetector } from './reuse-detection';
import { TokenRotationPolicy } from './rotation-policy';
import { RefreshTokenData, RefreshResult } from './types';
import { User, Tenant } from '../tokens/types';
export declare class RefreshService {
    private jwtGenerator;
    private jwtValidator;
    private tokenStore;
    private familyTracker;
    private reuseDetector;
    private rotationPolicy;
    constructor(jwtGenerator: JWTGenerator, jwtValidator: JWTValidator, tokenStore: RefreshTokenStore, familyTracker: FamilyTracker, reuseDetector: ReuseDetector, rotationPolicy: TokenRotationPolicy);
    /**
     * Refresh access token using refresh token
     */
    refresh(refreshToken: string, user: User, tenant: Tenant): Promise<RefreshResult>;
    /**
     * Generate new token pair during refresh
     */
    private generateNewTokenPair;
    /**
     * Revoke specific refresh token
     */
    revokeRefreshToken(tokenId: string): Promise<void>;
    /**
     * Revoke all user's refresh tokens
     */
    revokeAllUserTokens(userId: string): Promise<void>;
    /**
     * Revoke all session's refresh tokens
     */
    revokeAllSessionTokens(sessionId: string): Promise<void>;
    /**
     * Create initial refresh token (during login)
     */
    createInitialRefreshToken(refreshToken: string, userId: string, sessionId: string, deviceId: string, expiresIn: number): Promise<void>;
    /**
     * Get refresh token info
     */
    getTokenInfo(refreshToken: string): Promise<RefreshTokenData | null>;
    /**
     * Check if refresh token is valid
     */
    isValid(refreshToken: string): Promise<boolean>;
}
