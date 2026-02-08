"use strict";
/**
 * JWT Token Validator
 * Phase 2 - Authentication - Task AUTH-002
 *
 * Comprehensive JWT validation with signature verification,
 * claim validation, and revocation checking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTValidator = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const claim_validators_1 = require("./claim-validators");
const security_checks_1 = require("./security-checks");
const validation_errors_1 = require("./validation-errors");
class JWTValidator {
    keyProvider;
    config;
    revocationChecker;
    claimValidator;
    securityChecker;
    constructor(keyProvider, config, revocationChecker) {
        this.keyProvider = keyProvider;
        this.config = config;
        this.revocationChecker = revocationChecker;
        this.claimValidator = new claim_validators_1.ClaimValidator(config);
        this.securityChecker = new security_checks_1.SecurityChecker();
    }
    /**
     * Validate and decode JWT token
     */
    async validate(token, options = {}) {
        try {
            // Perform security checks
            const header = this.securityChecker.performSecurityChecks(token);
            // Get public key for verification
            const publicKey = this.keyProvider.getPublicKey(header.kid || '');
            if (!publicKey) {
                throw new validation_errors_1.TokenSignatureError(`Unknown key ID: ${header.kid}`);
            }
            // Verify signature and decode
            const payload = jsonwebtoken_1.default.verify(token, publicKey, {
                algorithms: [header.alg],
                clockTolerance: this.config.clockTolerance,
            });
            // Validate standard claims
            this.claimValidator.validateStandardClaims(payload, options.audience);
            // Validate access token specific claims if required
            if (options.requireAccessTokenClaims) {
                this.claimValidator.validateAccessTokenClaims(payload);
            }
            // Check revocation if enabled
            if (options.checkRevocation !== false && this.revocationChecker) {
                const revocationResult = await this.revocationChecker.isRevoked(payload.jti, payload.user_id || payload.sub, payload.session_id, payload.iat);
                if (revocationResult.revoked) {
                    throw new validation_errors_1.TokenRevokedError(`Token revoked: ${revocationResult.reason}`);
                }
            }
            return payload;
        }
        catch (error) {
            // Re-throw our custom errors
            if (error instanceof validation_errors_1.TokenValidationError) {
                throw error;
            }
            // Handle jsonwebtoken errors
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new validation_errors_1.TokenExpiredError('Token has expired');
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                if (error.message.includes('invalid signature')) {
                    throw new validation_errors_1.TokenSignatureError('Invalid token signature');
                }
                throw new validation_errors_1.TokenMalformedError(error.message);
            }
            // Unknown error
            throw new validation_errors_1.TokenValidationError('Token validation failed', 'VALIDATION_ERROR', 500);
        }
    }
    /**
     * Validate and decode token with full details
     */
    async validateAndDecode(token, options = {}) {
        const payload = await this.validate(token, options);
        // Decode header
        const headerPart = token.split('.')[0];
        const headerJson = Buffer.from(headerPart, 'base64').toString('utf8');
        const header = JSON.parse(headerJson);
        return { header, payload };
    }
    /**
     * Check if token is expired (without full validation)
     */
    isExpired(payload) {
        const now = Math.floor(Date.now() / 1000);
        return now >= payload.exp;
    }
    /**
     * Check if token is revoked
     */
    async isRevoked(tokenId, userId, sessionId, issuedAt) {
        if (!this.revocationChecker) {
            return false;
        }
        const result = await this.revocationChecker.isRevoked(tokenId, userId, sessionId, issuedAt);
        return result.revoked;
    }
    /**
     * Decode token without verification (use with caution)
     */
    decodeWithoutVerification(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch {
            return null;
        }
    }
    /**
     * Get token expiry time
     */
    getExpiry(token) {
        const payload = this.decodeWithoutVerification(token);
        if (!payload || !payload.exp) {
            return null;
        }
        return new Date(payload.exp * 1000);
    }
    /**
     * Get time until token expires
     */
    getTimeUntilExpiry(token) {
        const expiry = this.getExpiry(token);
        if (!expiry) {
            return null;
        }
        return Math.max(0, expiry.getTime() - Date.now());
    }
    /**
     * Validate token format without cryptographic verification
     */
    static isValidFormat(token) {
        return security_checks_1.SecurityChecker.isValidTokenFormat(token);
    }
    /**
     * Extract claims from token without verification
     */
    extractClaims(token) {
        try {
            const payload = this.decodeWithoutVerification(token);
            if (!payload)
                return null;
            return {
                jti: payload.jti,
                sub: payload.sub,
                iss: payload.iss,
                aud: payload.aud,
                exp: payload.exp,
                iat: payload.iat,
                user_id: payload.user_id,
                tenant_id: payload.tenant_id,
                session_id: payload.session_id,
            };
        }
        catch {
            return null;
        }
    }
}
exports.JWTValidator = JWTValidator;
//# sourceMappingURL=jwt-validator.js.map