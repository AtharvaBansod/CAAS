/**
 * Backup Code Service
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Generates and manages backup codes for MFA recovery
 */
import { BackupCodeGenerator } from './code-generator';
import { BackupCodeStorage } from './code-storage';
export declare class BackupCodeService {
    private generator;
    private storage;
    constructor(generator: BackupCodeGenerator, storage: BackupCodeStorage);
    /**
     * Generate backup codes for user
     */
    generateCodes(userId: string, count?: number): Promise<string[]>;
    /**
     * Verify backup code
     */
    verifyCode(userId: string, code: string): Promise<boolean>;
    /**
     * Regenerate backup codes (invalidates old ones)
     */
    regenerateCodes(userId: string, count?: number): Promise<string[]>;
    /**
     * Get remaining backup code count
     */
    getRemainingCount(userId: string): Promise<number>;
    /**
     * Check if user has backup codes
     */
    hasCodes(userId: string): Promise<boolean>;
    /**
     * Check if backup codes are low (< 3)
     */
    areCodesLow(userId: string): Promise<boolean>;
    /**
     * Get backup code statistics
     */
    getStats(userId: string): Promise<{
        total: number;
        used: number;
        remaining: number;
    }>;
}
