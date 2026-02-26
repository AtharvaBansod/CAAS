"use strict";
/**
 * Backup Code Service
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Generates and manages backup codes for MFA recovery
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupCodeService = void 0;
class BackupCodeService {
    generator;
    storage;
    constructor(generator, storage) {
        this.generator = generator;
        this.storage = storage;
    }
    /**
     * Generate backup codes for user
     */
    async generateCodes(userId, count = 10) {
        // Generate codes
        const codes = this.generator.generate(count);
        // Store hashed codes
        await this.storage.storeCodes(userId, codes);
        return codes;
    }
    /**
     * Verify backup code
     */
    async verifyCode(userId, code) {
        // Normalize code (remove hyphens, uppercase)
        const normalizedCode = this.generator.normalizeCode(code);
        // Verify and mark as used
        const isValid = await this.storage.verifyAndUseCode(userId, normalizedCode);
        if (isValid) {
            console.log('Backup code used:', {
                user_id: userId,
                timestamp: new Date().toISOString(),
            });
        }
        return isValid;
    }
    /**
     * Regenerate backup codes (invalidates old ones)
     */
    async regenerateCodes(userId, count = 10) {
        // Delete old codes
        await this.storage.deleteCodes(userId);
        // Generate new codes
        return await this.generateCodes(userId, count);
    }
    /**
     * Get remaining backup code count
     */
    async getRemainingCount(userId) {
        return await this.storage.getRemainingCount(userId);
    }
    /**
     * Check if user has backup codes
     */
    async hasCodes(userId) {
        const count = await this.getRemainingCount(userId);
        return count > 0;
    }
    /**
     * Check if backup codes are low (< 3)
     */
    async areCodesLow(userId) {
        const count = await this.getRemainingCount(userId);
        return count > 0 && count < 3;
    }
    /**
     * Get backup code statistics
     */
    async getStats(userId) {
        return await this.storage.getStats(userId);
    }
}
exports.BackupCodeService = BackupCodeService;
//# sourceMappingURL=backup-code-service.js.map
