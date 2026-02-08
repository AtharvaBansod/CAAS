"use strict";
/**
 * Challenge Storage
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Stores MFA challenges in Redis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChallengeStorage = void 0;
class ChallengeStorage {
    redis;
    keyPrefix;
    constructor(redis, keyPrefix = 'mfa_challenge:') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }
    /**
     * Store challenge
     */
    async storeChallenge(challenge) {
        const key = this.getKey(challenge.id);
        const ttl = Math.ceil((challenge.expires_at - Date.now()) / 1000);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(challenge));
        }
    }
    /**
     * Get challenge
     */
    async getChallenge(challengeId) {
        const key = this.getKey(challengeId);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Update challenge
     */
    async updateChallenge(challenge) {
        await this.storeChallenge(challenge);
    }
    /**
     * Delete challenge
     */
    async deleteChallenge(challengeId) {
        const key = this.getKey(challengeId);
        await this.redis.del(key);
    }
    /**
     * Get key for challenge
     */
    getKey(challengeId) {
        return `${this.keyPrefix}${challengeId}`;
    }
}
exports.ChallengeStorage = ChallengeStorage;
//# sourceMappingURL=challenge-storage.js.map