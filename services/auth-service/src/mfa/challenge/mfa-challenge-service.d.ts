/**
 * MFA Challenge Service
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Manages MFA challenge flow during authentication
 */
import { MFAChallenge, MFAChallengeResult, MFAMethod } from '../types';
import { ChallengeStorage } from './challenge-storage';
import { MethodVerifier } from './method-verifier';
export declare class MFAChallengeService {
    private storage;
    private verifier;
    private maxAttempts;
    private challengeTTL;
    constructor(storage: ChallengeStorage, verifier: MethodVerifier, maxAttempts?: number, challengeTTL?: number);
    /**
     * Create MFA challenge
     */
    createChallenge(userId: string, sessionId: string, availableMethods: MFAMethod[]): Promise<MFAChallenge>;
    /**
     * Verify MFA challenge response
     */
    verifyChallenge(challengeId: string, method: MFAMethod, response: string, trustDevice?: boolean): Promise<MFAChallengeResult>;
    /**
     * Get available methods for user
     */
    getAvailableMethods(userId: string): Promise<MFAMethod[]>;
    /**
     * Switch MFA method
     */
    switchMethod(challengeId: string, method: MFAMethod): Promise<MFAChallenge>;
    /**
     * Get challenge
     */
    getChallenge(challengeId: string): Promise<MFAChallenge | null>;
    /**
     * Delete challenge
     */
    deleteChallenge(challengeId: string): Promise<void>;
    /**
     * Get challenge TTL
     */
    getChallengeTTL(): number;
    /**
     * Get max attempts
     */
    getMaxAttempts(): number;
}
