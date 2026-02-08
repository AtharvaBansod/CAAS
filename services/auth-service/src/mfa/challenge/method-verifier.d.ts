/**
 * Method Verifier
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Routes verification to appropriate MFA method
 */
import { MFAMethod } from '../types';
import { TOTPService } from '../totp/totp-service';
import { BackupCodeService } from '../backup-codes/backup-code-service';
export declare class MethodVerifier {
    private totpService;
    private backupCodeService;
    constructor(totpService: TOTPService, backupCodeService: BackupCodeService);
    /**
     * Verify MFA response
     */
    verify(userId: string, method: MFAMethod, response: string): Promise<boolean>;
    /**
     * Get available methods for user
     */
    getAvailableMethods(userId: string): Promise<MFAMethod[]>;
    /**
     * Verify TOTP
     */
    private verifyTOTP;
    /**
     * Verify backup code
     */
    private verifyBackupCode;
}
