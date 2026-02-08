/**
 * Backup Code Storage
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Stores and manages backup codes in database
 */
export interface BackupCodeStorage {
    storeCodes(userId: string, codes: string[]): Promise<void>;
    verifyAndUseCode(userId: string, code: string): Promise<boolean>;
    deleteCodes(userId: string): Promise<void>;
    getRemainingCount(userId: string): Promise<number>;
    getStats(userId: string): Promise<{
        total: number;
        used: number;
        remaining: number;
    }>;
}
/**
 * In-memory implementation (replace with database in production)
 */
export declare class InMemoryBackupCodeStorage implements BackupCodeStorage {
    private storage;
    /**
     * Store backup codes (hashed)
     */
    storeCodes(userId: string, codes: string[]): Promise<void>;
    /**
     * Verify code and mark as used
     */
    verifyAndUseCode(userId: string, code: string): Promise<boolean>;
    /**
     * Delete all codes for user
     */
    deleteCodes(userId: string): Promise<void>;
    /**
     * Get remaining (unused) code count
     */
    getRemainingCount(userId: string): Promise<number>;
    /**
     * Get backup code statistics
     */
    getStats(userId: string): Promise<{
        total: number;
        used: number;
        remaining: number;
    }>;
    /**
     * Hash backup code
     */
    private hashCode;
}
/**
 * Create backup code storage instance
 */
export declare function createBackupCodeStorage(): BackupCodeStorage;
