"use strict";
/**
 * JWT Claim Validators
 * Phase 2 - Authentication - Task AUTH-002
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimValidator = void 0;
const validation_errors_1 = require("./validation-errors");
class ClaimValidator {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Validate issuer claim
     */
    validateIssuer(iss) {
        if (!iss) {
            throw new validation_errors_1.TokenClaimError('Missing "iss" (issuer) claim', 'iss');
        }
        if (iss !== this.config.issuer) {
            throw new validation_errors_1.TokenClaimError(`Invalid issuer. Expected "${this.config.issuer}", got "${iss}"`, 'iss');
        }
    }
    /**
     * Validate audience claim
     */
    validateAudience(aud, expectedAudience) {
        if (!aud) {
            throw new validation_errors_1.TokenClaimError('Missing "aud" (audience) claim', 'aud');
        }
        if (expectedAudience && aud !== expectedAudience) {
            throw new validation_errors_1.TokenClaimError(`Invalid audience. Expected "${expectedAudience}", got "${aud}"`, 'aud');
        }
    }
    /**
     * Validate expiration with clock tolerance
     */
    validateExpiration(exp) {
        if (!exp) {
            throw new validation_errors_1.TokenClaimError('Missing "exp" (expiration) claim', 'exp');
        }
        if (typeof exp !== 'number') {
            throw new validation_errors_1.TokenClaimError('Expiration claim must be a number', 'exp');
        }
        const now = Math.floor(Date.now() / 1000);
        const expirationWithTolerance = exp + this.config.clockTolerance;
        if (now >= expirationWithTolerance) {
            const expiredAt = new Date(exp * 1000).toISOString();
            throw new validation_errors_1.TokenExpiredError(`Token expired at ${expiredAt}`);
        }
    }
    /**
     * Validate issued-at claim (reject future tokens)
     */
    validateIssuedAt(iat) {
        if (!iat) {
            throw new validation_errors_1.TokenClaimError('Missing "iat" (issued at) claim', 'iat');
        }
        if (typeof iat !== 'number') {
            throw new validation_errors_1.TokenClaimError('Issued at claim must be a number', 'iat');
        }
        const now = Math.floor(Date.now() / 1000);
        const issuedAtWithTolerance = iat - this.config.clockTolerance;
        // Reject tokens issued in the future
        if (issuedAtWithTolerance > now) {
            throw new validation_errors_1.TokenClaimError('Token issued in the future', 'iat');
        }
    }
    /**
     * Validate subject claim
     */
    validateSubject(sub) {
        if (!sub) {
            throw new validation_errors_1.TokenClaimError('Missing "sub" (subject) claim', 'sub');
        }
        if (typeof sub !== 'string' || sub.trim() === '') {
            throw new validation_errors_1.TokenClaimError('Subject claim must be a non-empty string', 'sub');
        }
    }
    /**
     * Validate JWT ID claim
     */
    validateJwtId(jti) {
        if (!jti) {
            throw new validation_errors_1.TokenClaimError('Missing "jti" (JWT ID) claim', 'jti');
        }
        if (typeof jti !== 'string' || jti.trim() === '') {
            throw new validation_errors_1.TokenClaimError('JWT ID claim must be a non-empty string', 'jti');
        }
    }
    /**
     * Validate required claims are present
     */
    validateRequiredClaims(payload, requiredClaims) {
        for (const claim of requiredClaims) {
            if (!(claim in payload)) {
                throw new validation_errors_1.TokenClaimError(`Missing required claim: ${claim}`, claim);
            }
        }
    }
    /**
     * Validate standard JWT claims
     */
    validateStandardClaims(payload, expectedAudience) {
        this.validateIssuer(payload.iss);
        this.validateSubject(payload.sub);
        this.validateExpiration(payload.exp);
        this.validateIssuedAt(payload.iat);
        this.validateJwtId(payload.jti);
        if (expectedAudience || payload.aud) {
            this.validateAudience(payload.aud, expectedAudience);
        }
    }
    /**
     * Validate custom claims for access tokens
     */
    validateAccessTokenClaims(payload) {
        const requiredClaims = ['tenant_id', 'user_id', 'scopes', 'permissions', 'session_id'];
        this.validateRequiredClaims(payload, requiredClaims);
        // Validate scopes is an array
        if (!Array.isArray(payload.scopes)) {
            throw new validation_errors_1.TokenClaimError('Scopes must be an array', 'scopes');
        }
        // Validate permissions is an array
        if (!Array.isArray(payload.permissions)) {
            throw new validation_errors_1.TokenClaimError('Permissions must be an array', 'permissions');
        }
        // Validate tenant_id and user_id match sub and aud
        if (payload.user_id !== payload.sub) {
            throw new validation_errors_1.TokenClaimError('user_id must match sub claim', 'user_id');
        }
        if (payload.tenant_id !== payload.aud) {
            throw new validation_errors_1.TokenClaimError('tenant_id must match aud claim', 'tenant_id');
        }
    }
    /**
     * Validate not before claim (if present)
     */
    validateNotBefore(nbf) {
        if (!nbf)
            return; // Optional claim
        if (typeof nbf !== 'number') {
            throw new validation_errors_1.TokenClaimError('Not before claim must be a number', 'nbf');
        }
        const now = Math.floor(Date.now() / 1000);
        const notBeforeWithTolerance = nbf - this.config.clockTolerance;
        if (now < notBeforeWithTolerance) {
            const notBeforeDate = new Date(nbf * 1000).toISOString();
            throw new validation_errors_1.TokenClaimError(`Token not valid before ${notBeforeDate}`, 'nbf');
        }
    }
}
exports.ClaimValidator = ClaimValidator;
//# sourceMappingURL=claim-validators.js.map