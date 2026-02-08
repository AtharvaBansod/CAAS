/**
 * Method Verifier
 * Phase 2 - Authentication - Task AUTH-012
 * 
 * Routes verification to appropriate MFA method
 */

import { MFAMethod } from '../types';
import { TOTPService } from '../totp/totp-service';
import { BackupCodeService } from '../backup-codes/backup-code-service';

export class MethodVerifier {
  constructor(
    private totpService: TOTPService,
    private backupCodeService: BackupCodeService
  ) {}

  /**
   * Verify MFA response
   */
  async verify(userId: string, method: MFAMethod, response: string): Promise<boolean> {
    switch (method) {
      case 'totp':
        return await this.verifyTOTP(userId, response);
      
      case 'backup_code':
        return await this.verifyBackupCode(userId, response);
      
      case 'email':
        // TODO: Implement email verification
        return false;
      
      case 'sms':
        // TODO: Implement SMS verification
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Get available methods for user
   */
  async getAvailableMethods(userId: string): Promise<MFAMethod[]> {
    const methods: MFAMethod[] = [];

    // Check TOTP
    // TODO: Check if user has TOTP enabled
    methods.push('totp');

    // Check backup codes
    const hasBackupCodes = await this.backupCodeService.hasCodes(userId);
    if (hasBackupCodes) {
      methods.push('backup_code');
    }

    return methods;
  }

  /**
   * Verify TOTP
   */
  private async verifyTOTP(userId: string, token: string): Promise<boolean> {
    // TODO: Get user's TOTP secret from database
    const secret = 'user-totp-secret'; // Placeholder
    return this.totpService.verifyToken(secret, token);
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    return await this.backupCodeService.verifyCode(userId, code);
  }
}
