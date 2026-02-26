"use strict";
/**
 * Method Verifier
 * Phase 2 - Authentication - Task AUTH-012
 *
 * Routes verification to appropriate MFA method
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodVerifier = void 0;
class MethodVerifier {
    totpService;
    backupCodeService;
    constructor(totpService, backupCodeService) {
        this.totpService = totpService;
        this.backupCodeService = backupCodeService;
    }
    /**
     * Verify MFA response
     */
    async verify(userId, method, response) {
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
    async getAvailableMethods(userId) {
        const methods = [];
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
    async verifyTOTP(userId, token) {
        // TODO: Get user's TOTP secret from database
        const secret = 'user-totp-secret'; // Placeholder
        return this.totpService.verifyToken(secret, token);
    }
    /**
     * Verify backup code
     */
    async verifyBackupCode(userId, code) {
        return await this.backupCodeService.verifyCode(userId, code);
    }
}
exports.MethodVerifier = MethodVerifier;
//# sourceMappingURL=method-verifier.js.map
