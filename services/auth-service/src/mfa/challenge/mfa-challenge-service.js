"use strict";
/**
 * MFA Challenge Service
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Manages MFA challenge flow during authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAChallengeService = void 0;
const crypto_1 = require("crypto");
class MFAChallengeService {
    storage;
    verifier;
    maxAttempts;
    challengeTTL;
    constructor(storage, verifier, maxAttempts = 5, challengeTTL = 300 // 5 minutes
    ) {
        this.storage = storage;
        this.verifier = verifier;
        this.maxAttempts = maxAttempts;
        this.challengeTTL = challengeTTL;
    }
    /**
     * Create MFA challenge
     */
    async createChallenge(userId, sessionId, availableMethods) {
        const challengeId = (0, crypto_1.randomUUID)();
        const now = Date.now();
        const challenge = {
            id: challengeId,
            user_id: userId,
            session_id: sessionId,
            method: availableMethods[0], // Default to first method
            available_methods: availableMethods,
            expires_at: now + this.challengeTTL * 1000,
            attempts: 0,
            max_attempts: this.maxAttempts,
            created_at: now,
        };
        await this.storage.storeChallenge(challenge);
        return challenge;
    }
    /**
     * Verify MFA challenge response
     */
    async verifyChallenge(challengeId, method, response, trustDevice = false) {
        // Get challenge
        const challenge = await this.storage.getChallenge(challengeId);
        if (!challenge) {
            return {
                success: false,
                challenge_id: challengeId,
                method_used: method,
                error: 'Challenge not found or expired',
            };
        }
        // Check expiry
        if (Date.now() >= challenge.expires_at) {
            await this.storage.deleteChallenge(challengeId);
            return {
                success: false,
                challenge_id: challengeId,
                method_used: method,
                error: 'Challenge expired',
            };
        }
        // Check attempts
        if (challenge.attempts >= challenge.max_attempts) {
            await this.storage.deleteChallenge(challengeId);
            return {
                success: false,
                challenge_id: challengeId,
                method_used: method,
                error: 'Maximum attempts exceeded',
            };
        }
        // Increment attempts
        challenge.attempts++;
        await this.storage.updateChallenge(challenge);
        // Verify response
        const isValid = await this.verifier.verify(challenge.user_id, method, response);
        if (!isValid) {
            return {
                success: false,
                challenge_id: challengeId,
                method_used: method,
                error: 'Invalid verification code',
            };
        }
        // Success - delete challenge
        await this.storage.deleteChallenge(challengeId);
        return {
            success: true,
            challenge_id: challengeId,
            method_used: method,
            trust_device: trustDevice,
        };
    }
    /**
     * Get available methods for user
     */
    async getAvailableMethods(userId) {
        return await this.verifier.getAvailableMethods(userId);
    }
    /**
     * Switch MFA method
     */
    async switchMethod(challengeId, method) {
        const challenge = await this.storage.getChallenge(challengeId);
        if (!challenge) {
            throw new Error('Challenge not found');
        }
        if (!challenge.available_methods.includes(method)) {
            throw new Error('Method not available');
        }
        challenge.method = method;
        challenge.attempts = 0; // Reset attempts when switching method
        await this.storage.updateChallenge(challenge);
        return challenge;
    }
    /**
     * Get challenge
     */
    async getChallenge(challengeId) {
        return await this.storage.getChallenge(challengeId);
    }
    /**
     * Delete challenge
     */
    async deleteChallenge(challengeId) {
        await this.storage.deleteChallenge(challengeId);
    }
    /**
     * Get challenge TTL
     */
    getChallengeTTL() {
        return this.challengeTTL;
    }
    /**
     * Get max attempts
     */
    getMaxAttempts() {
        return this.maxAttempts;
    }
}
exports.MFAChallengeService = MFAChallengeService;
//# sourceMappingURL=mfa-challenge-service.js.map
