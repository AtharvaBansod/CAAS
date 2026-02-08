/**
 * JWT Token Validator
 * Phase 2 - Authentication - Task AUTH-002
 *
 * Comprehensive JWT validation with signature verification,
 * claim validation, and revocation checking
 */
import { KeyProvider } from './key-provider';
import { JWTConfig } from './jwt-config';
import { RevocationChecker } from './revocation-checker';
import { AccessTokenPayload, JWTHeader } from './types';
export interface ValidateOptions {
    audience?: string;
    checkRevocation?: boolean;
    requireAccessTokenClaims?: boolean;
}
export interface TokenPayload extends AccessTokenPayload {
    [key: string]: any;
}
export interface DecodedToken {
    header: JWTHeader;
    payload: TokenPayload;
}
export declare class JWTValidator {
    private keyProvider;
    private config;
    private revocationChecker?;
    private claimValidator;
    private securityChecker;
    constructor(keyProvider: KeyProvider, config: JWTConfig, revocationChecker?: RevocationChecker | undefined);
    /**
     * Validate and decode JWT token
     */
    validate(token: string, options?: ValidateOptions): Promise<TokenPayload>;
    /**
     * Validate and decode token with full details
     */
    validateAndDecode(token: string, options?: ValidateOptions): Promise<DecodedToken>;
    /**
     * Check if token is expired (without full validation)
     */
    isExpired(payload: TokenPayload): boolean;
    /**
     * Check if token is revoked
     */
    isRevoked(tokenId: string, userId: string, sessionId: string, issuedAt: number): Promise<boolean>;
    /**
     * Decode token without verification (use with caution)
     */
    decodeWithoutVerification(token: string): TokenPayload | null;
    /**
     * Get token expiry time
     */
    getExpiry(token: string): Date | null;
    /**
     * Get time until token expires
     */
    getTimeUntilExpiry(token: string): number | null;
    /**
     * Validate token format without cryptographic verification
     */
    static isValidFormat(token: string): boolean;
    /**
     * Extract claims from token without verification
     */
    extractClaims(token: string): Partial<TokenPayload> | null;
}
