"use strict";
/**
 * Token Family Tracker
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Tracks token lineage for rotation and reuse detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyTracker = void 0;
const crypto_1 = require("crypto");
class FamilyTracker {
    redis;
    keyPrefix;
    constructor(redis, keyPrefix = 'token_family:') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }
    /**
     * Get Redis key for family
     */
    getKey(familyId) {
        return `${this.keyPrefix}${familyId}`;
    }
    /**
     * Create a new token family
     */
    async createFamily(userId, initialTokenId) {
        const familyId = (0, crypto_1.randomUUID)();
        const family = {
            family_id: familyId,
            user_id: userId,
            created_at: Date.now(),
            tokens: [initialTokenId],
            revoked: false,
        };
        const key = this.getKey(familyId);
        // Store family for 30 days
        await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(family));
        return familyId;
    }
    /**
     * Add token to family
     */
    async addTokenToFamily(familyId, tokenId) {
        const family = await this.getFamily(familyId);
        if (!family) {
            throw new Error(`Token family not found: ${familyId}`);
        }
        family.tokens.push(tokenId);
        const key = this.getKey(familyId);
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(family));
        }
    }
    /**
     * Get token family
     */
    async getFamily(familyId) {
        const key = this.getKey(familyId);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    /**
     * Revoke entire token family
     */
    async revokeFamily(familyId) {
        const family = await this.getFamily(familyId);
        if (!family) {
            return;
        }
        family.revoked = true;
        const key = this.getKey(familyId);
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, JSON.stringify(family));
        }
    }
    /**
     * Check if family is revoked
     */
    async isFamilyRevoked(familyId) {
        const family = await this.getFamily(familyId);
        return family?.revoked || false;
    }
    /**
     * Get family size (number of tokens)
     */
    async getFamilySize(familyId) {
        const family = await this.getFamily(familyId);
        return family?.tokens.length || 0;
    }
    /**
     * Check if token is in family
     */
    async isTokenInFamily(familyId, tokenId) {
        const family = await this.getFamily(familyId);
        return family?.tokens.includes(tokenId) || false;
    }
    /**
     * Get all families for user
     */
    async getUserFamilies(userId) {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        const families = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const family = JSON.parse(data);
                if (family.user_id === userId) {
                    families.push(family);
                }
            }
        }
        return families;
    }
    /**
     * Cleanup revoked families
     */
    async cleanupRevokedFamilies() {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        let cleaned = 0;
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const family = JSON.parse(data);
                if (family.revoked) {
                    await this.redis.del(key);
                    cleaned++;
                }
            }
        }
        return cleaned;
    }
    /**
     * Delete family
     */
    async deleteFamily(familyId) {
        const key = this.getKey(familyId);
        await this.redis.del(key);
    }
    /**
     * Get family statistics
     */
    async getFamilyStats() {
        const pattern = `${this.keyPrefix}*`;
        const keys = await this.redis.keys(pattern);
        let totalFamilies = 0;
        let revokedFamilies = 0;
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                totalFamilies++;
                const family = JSON.parse(data);
                if (family.revoked) {
                    revokedFamilies++;
                }
            }
        }
        return {
            totalFamilies,
            revokedFamilies,
            activeFamilies: totalFamilies - revokedFamilies,
        };
    }
}
exports.FamilyTracker = FamilyTracker;
//# sourceMappingURL=family-tracker.js.map
