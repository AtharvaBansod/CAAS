/**
 * JWT Claim Validators
 * Phase 2 - Authentication - Task AUTH-002
 */
import { JWTConfig } from './jwt-config';
export declare class ClaimValidator {
    private config;
    constructor(config: JWTConfig);
    /**
     * Validate issuer claim
     */
    validateIssuer(iss: string | undefined): void;
    /**
     * Validate audience claim
     */
    validateAudience(aud: string | undefined, expectedAudience?: string): void;
    /**
     * Validate expiration with clock tolerance
     */
    validateExpiration(exp: number | undefined): void;
    /**
     * Validate issued-at claim (reject future tokens)
     */
    validateIssuedAt(iat: number | undefined): void;
    /**
     * Validate subject claim
     */
    validateSubject(sub: string | undefined): void;
    /**
     * Validate JWT ID claim
     */
    validateJwtId(jti: string | undefined): void;
    /**
     * Validate required claims are present
     */
    validateRequiredClaims(payload: any, requiredClaims: string[]): void;
    /**
     * Validate standard JWT claims
     */
    validateStandardClaims(payload: any, expectedAudience?: string): void;
    /**
     * Validate custom claims for access tokens
     */
    validateAccessTokenClaims(payload: any): void;
    /**
     * Validate not before claim (if present)
     */
    validateNotBefore(nbf: number | undefined): void;
}
