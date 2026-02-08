/**
 * Refresh Token Store
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Stores refresh tokens in Redis with hashing for security
 */
import Redis from 'ioredis';
import { RefreshTokenData } from './types';
export declare class RefreshTokenStore {
    private redis;
    private keyPrefix;
    constructor(redis: Redis, keyPrefix?: string);
    /**
     * Hash token for storage (never store plain tokens)
     */
    private hashToken;
    /**
     * Get Redis key for token
     */
    private getKey;
    /**
     * Get Redis key for user tokens index
     */
    private getUserTokensKey;
    /**
     * Store refresh token
     */
    store(token: string, data: RefreshTokenData, ttlSeconds: number): Promise<void>;
    /**
     * Get refresh token data
     */
    get(token: string): Promise<RefreshTokenData | null>;
    /**
     * Mark token as used
     */
    markAsUsed(token: string): Promise<void>;
    /**
     * Revoke token
     */
    revoke(token: string): Promise<void>;
    /**
     * Delete token
     */
    delete(token: string): Promise<void>;
    /**
     * Get all user's refresh tokens
     */
    getUserTokens(userId: string): Promise<RefreshTokenData[]>;
    /**
     * Revoke all user's refresh tokens
     */
    revokeAllUserTokens(userId: string): Promise<number>;
    /**
     * Delete all user's refresh tokens
     */
    deleteAllUserTokens(userId: string): Promise<number>;
    /**
     * Get token count for user
     */
    getUserTokenCount(userId: string): Promise<number>;
    /**
     * Check if token exists
     */
    exists(token: string): Promise<boolean>;
}
