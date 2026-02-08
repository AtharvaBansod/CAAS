/**
 * Backup Code Service
 * Phase 2 - Authentication - Task AUTH-010
 * 
 * Generates and manages backup codes for MFA recovery
 */

import { BackupCodeGenerator } from './code-generator';
import { BackupCodeStorage } from './code-storage';

export class BackupCodeService {
  constructor(
    private generator: BackupCodeGenerator,
    private storage: BackupCodeStorage
  ) {}

  /**
   * Generate backup codes for user
   */
  async generateCodes(userId: string, count: number = 10): Promise<string[]> {
    // Generate codes
    const codes = this.generator.generate(count);

    // Store hashed codes
    await this.storage.storeCodes(userId, codes);

    return codes;
  }

  /**
   * Verify backup code
   */
  async verifyCode(userId: string, code: string): Promise<boolean> {
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
  async regenerateCodes(userId: string, count: number = 10): Promise<string[]> {
    // Delete old codes
    await this.storage.deleteCodes(userId);

    // Generate new codes
    return await this.generateCodes(userId, count);
  }

  /**
   * Get remaining backup code count
   */
  async getRemainingCount(userId: string): Promise<number> {
    return await this.storage.getRemainingCount(userId);
  }

  /**
   * Check if user has backup codes
   */
  async hasCodes(userId: string): Promise<boolean> {
    const count = await this.getRemainingCount(userId);
    return count > 0;
  }

  /**
   * Check if backup codes are low (< 3)
   */
  async areCodesLow(userId: string): Promise<boolean> {
    const count = await this.getRemainingCount(userId);
    return count > 0 && count < 3;
  }

  /**
   * Get backup code statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    used: number;
    remaining: number;
  }> {
    return await this.storage.getStats(userId);
  }
}
