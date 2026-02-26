"use strict";
/**
 * Backup Code Storage
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Stores and manages backup codes in database
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryBackupCodeStorage = void 0;
exports.createBackupCodeStorage = createBackupCodeStorage;
const crypto_1 = require("crypto");
/**
 * In-memory implementation (replace with database in production)
 */
class InMemoryBackupCodeStorage {
    storage = new Map();
    /**
     * Store backup codes (hashed)
     */
    async storeCodes(userId, codes) {
        const hashedCodes = codes.map(code => ({
            code_hash: this.hashCode(code),
            used: false,
        }));
        this.storage.set(userId, hashedCodes);
    }
    /**
     * Verify code and mark as used
     */
    async verifyAndUseCode(userId, code) {
        const codes = this.storage.get(userId);
        if (!codes) {
            return false;
        }
        const codeHash = this.hashCode(code);
        // Find matching unused code
        const matchingCode = codes.find(c => c.code_hash === codeHash && !c.used);
        if (!matchingCode) {
            return false;
        }
        // Mark as used
        matchingCode.used = true;
        matchingCode.used_at = Date.now();
        return true;
    }
    /**
     * Delete all codes for user
     */
    async deleteCodes(userId) {
        this.storage.delete(userId);
    }
    /**
     * Get remaining (unused) code count
     */
    async getRemainingCount(userId) {
        const codes = this.storage.get(userId);
        if (!codes) {
            return 0;
        }
        return codes.filter(c => !c.used).length;
    }
    /**
     * Get backup code statistics
     */
    async getStats(userId) {
        const codes = this.storage.get(userId);
        if (!codes) {
            return { total: 0, used: 0, remaining: 0 };
        }
        const used = codes.filter(c => c.used).length;
        const total = codes.length;
        const remaining = total - used;
        return { total, used, remaining };
    }
    /**
     * Hash backup code
     */
    hashCode(code) {
        return (0, crypto_1.createHash)('sha256').update(code).digest('hex');
    }
}
exports.InMemoryBackupCodeStorage = InMemoryBackupCodeStorage;
/**
 * Create backup code storage instance
 */
function createBackupCodeStorage() {
    // TODO: Replace with MongoDB implementation
    return new InMemoryBackupCodeStorage();
}
//# sourceMappingURL=code-storage.js.map
