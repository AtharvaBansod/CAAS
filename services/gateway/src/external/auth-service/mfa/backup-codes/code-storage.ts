/**
 * Backup Code Storage
 * Phase 2 - Authentication - Task AUTH-010
 * 
 * Stores and manages backup codes in database
 */

import { createHash } from 'crypto';
import { BackupCode } from '../types';

export interface BackupCodeStorage {
  storeCodes(userId: string, codes: string[]): Promise<void>;
  verifyAndUseCode(userId: string, code: string): Promise<boolean>;
  deleteCodes(userId: string): Promise<void>;
  getRemainingCount(userId: string): Promise<number>;
  getStats(userId: string): Promise<{ total: number; used: number; remaining: number }>;
}

/**
 * In-memory implementation (replace with database in production)
 */
export class InMemoryBackupCodeStorage implements BackupCodeStorage {
  private storage: Map<string, BackupCode[]> = new Map();

  /**
   * Store backup codes (hashed)
   */
  async storeCodes(userId: string, codes: string[]): Promise<void> {
    const hashedCodes: BackupCode[] = codes.map(code => ({
      code_hash: this.hashCode(code),
      used: false,
    }));

    this.storage.set(userId, hashedCodes);
  }

  /**
   * Verify code and mark as used
   */
  async verifyAndUseCode(userId: string, code: string): Promise<boolean> {
    const codes = this.storage.get(userId);
    if (!codes) {
      return false;
    }

    const codeHash = this.hashCode(code);

    // Find matching unused code
    const matchingCode = codes.find(
      c => c.code_hash === codeHash && !c.used
    );

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
  async deleteCodes(userId: string): Promise<void> {
    this.storage.delete(userId);
  }

  /**
   * Get remaining (unused) code count
   */
  async getRemainingCount(userId: string): Promise<number> {
    const codes = this.storage.get(userId);
    if (!codes) {
      return 0;
    }

    return codes.filter(c => !c.used).length;
  }

  /**
   * Get backup code statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    used: number;
    remaining: number;
  }> {
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
  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}

/**
 * Create backup code storage instance
 */
export function createBackupCodeStorage(): BackupCodeStorage {
  // TODO: Replace with MongoDB implementation
  return new InMemoryBackupCodeStorage();
}
