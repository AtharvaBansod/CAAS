/**
 * TOTP Service
 * Phase 2 - Authentication - Task AUTH-009
 *
 * Time-based One-Time Password implementation
 */
import { TOTPSetup } from '../types';
export interface TOTPConfig {
    issuer: string;
    algorithm: string;
    digits: number;
    period: number;
    window: number;
}
export declare const defaultTOTPConfig: TOTPConfig;
export declare class TOTPService {
    private config;
    constructor(config?: TOTPConfig);
    /**
     * Generate TOTP secret and setup data
     */
    generateSecret(userEmail: string): Omit<TOTPSetup, 'backup_codes'>;
    /**
     * Verify TOTP token
     */
    verifyToken(secret: string, token: string): boolean;
    /**
     * Generate current TOTP token (for testing)
     */
    generateToken(secret: string): string;
    /**
     * Get time remaining until next token
     */
    getTimeRemaining(): number;
    /**
     * Generate base32 secret
     */
    private generateBase32Secret;
    /**
     * Base32 encode
     */
    private base32Encode;
    /**
     * Validate secret format
     */
    isValidSecret(secret: string): boolean;
}
