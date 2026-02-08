/**
 * Token Family Tracker
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Tracks token lineage for rotation and reuse detection
 */
import Redis from 'ioredis';
import { RefreshTokenFamily } from './types';
export declare class FamilyTracker {
    private redis;
    private keyPrefix;
    constructor(redis: Redis, keyPrefix?: string);
    /**
     * Get Redis key for family
     */
    private getKey;
    /**
     * Create a new token family
     */
    createFamily(userId: string, initialTokenId: string): Promise<string>;
    /**
     * Add token to family
     */
    addTokenToFamily(familyId: string, tokenId: string): Promise<void>;
    /**
     * Get token family
     */
    getFamily(familyId: string): Promise<RefreshTokenFamily | null>;
    /**
     * Revoke entire token family
     */
    revokeFamily(familyId: string): Promise<void>;
    /**
     * Check if family is revoked
     */
    isFamilyRevoked(familyId: string): Promise<boolean>;
    /**
     * Get family size (number of tokens)
     */
    getFamilySize(familyId: string): Promise<number>;
    /**
     * Check if token is in family
     */
    isTokenInFamily(familyId: string, tokenId: string): Promise<boolean>;
    /**
     * Get all families for user
     */
    getUserFamilies(userId: string): Promise<RefreshTokenFamily[]>;
    /**
     * Cleanup revoked families
     */
    cleanupRevokedFamilies(): Promise<number>;
    /**
     * Delete family
     */
    deleteFamily(familyId: string): Promise<void>;
    /**
     * Get family statistics
     */
    getFamilyStats(): Promise<{
        totalFamilies: number;
        revokedFamilies: number;
        activeFamilies: number;
    }>;
}
