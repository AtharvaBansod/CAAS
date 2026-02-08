/**
 * Challenge Storage
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Stores MFA challenges in Redis
 */
import Redis from 'ioredis';
import { MFAChallenge } from '../types';
export declare class ChallengeStorage {
    private redis;
    private keyPrefix;
    constructor(redis: Redis, keyPrefix?: string);
    /**
     * Store challenge
     */
    storeChallenge(challenge: MFAChallenge): Promise<void>;
    /**
     * Get challenge
     */
    getChallenge(challengeId: string): Promise<MFAChallenge | null>;
    /**
     * Update challenge
     */
    updateChallenge(challenge: MFAChallenge): Promise<void>;
    /**
     * Delete challenge
     */
    deleteChallenge(challengeId: string): Promise<void>;
    /**
     * Get key for challenge
     */
    private getKey;
}
