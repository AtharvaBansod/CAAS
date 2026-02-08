"use strict";
/**
 * JWT Token Generator
 * Phase 2 - Authentication - Task AUTH-001
 *
 * Generates JWT tokens with RS256/ES256 algorithms
 * Supports access tokens, refresh tokens, and service tokens
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTGenerator = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const token_id_generator_1 = require("./token-id-generator");
class JWTGenerator {
    keyProvider;
    config;
    constructor(keyProvider, config) {
        this.keyProvider = keyProvider;
        this.config = config;
    }
    /**
     * Generate access and refresh token pair
     */
    async generateAccessToken(params) {
        const { user, tenant, scopes, deviceId, sessionId, permissions = [] } = params;
        // Get signing key
        const signingKey = this.keyProvider.getSigningKey(tenant.id);
        // Generate token IDs
        const accessTokenId = token_id_generator_1.TokenIdGenerator.generateAccessTokenId();
        const refreshTokenId = token_id_generator_1.TokenIdGenerator.generateRefreshTokenId();
        // Current timestamp
        const now = Math.floor(Date.now() / 1000);
        // Access token payload
        const accessPayload = {
            iss: this.config.issuer,
            sub: user.id,
            aud: tenant.id,
            exp: now + this.config.accessTokenExpiry,
            iat: now,
            jti: accessTokenId,
            tenant_id: tenant.id,
            user_id: user.id,
            scopes,
            permissions,
            session_id: sessionId,
            ...(deviceId && { device_id: deviceId }),
        };
        // Refresh token payload
        const refreshPayload = {
            iss: this.config.issuer,
            sub: user.id,
            jti: refreshTokenId,
            exp: now + this.config.refreshTokenExpiry,
            iat: now,
            token_type: 'refresh',
        };
        // JWT header with key ID
        const header = {
            kid: signingKey.kid,
        };
        // Sign tokens
        const accessToken = jsonwebtoken_1.default.sign(accessPayload, signingKey.privateKey, {
            algorithm: signingKey.algorithm,
            header,
        });
        const refreshToken = jsonwebtoken_1.default.sign(refreshPayload, signingKey.privateKey, {
            algorithm: signingKey.algorithm,
            header,
        });
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: this.config.accessTokenExpiry,
            refresh_expires_in: this.config.refreshTokenExpiry,
        };
    }
    /**
     * Generate refresh token only
     */
    async generateRefreshToken(userId, tokenId) {
        const signingKey = this.keyProvider.getSigningKey();
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: this.config.issuer,
            sub: userId,
            jti: tokenId,
            exp: now + this.config.refreshTokenExpiry,
            iat: now,
            token_type: 'refresh',
        };
        const header = {
            kid: signingKey.kid,
        };
        return jsonwebtoken_1.default.sign(payload, signingKey.privateKey, {
            algorithm: signingKey.algorithm,
            header,
        });
    }
    /**
     * Generate service-to-service token
     */
    async generateServiceToken(service) {
        const signingKey = this.keyProvider.getSigningKey();
        const now = Math.floor(Date.now() / 1000);
        const tokenId = token_id_generator_1.TokenIdGenerator.generateServiceTokenId();
        const payload = {
            iss: this.config.issuer,
            sub: service,
            jti: tokenId,
            exp: now + this.config.serviceTokenExpiry,
            iat: now,
            service,
            token_type: 'service',
        };
        const header = {
            kid: signingKey.kid,
        };
        return jsonwebtoken_1.default.sign(payload, signingKey.privateKey, {
            algorithm: signingKey.algorithm,
            header,
        });
    }
    /**
     * Generate short-lived token for specific purpose
     */
    async generateShortLivedToken(userId, purpose, expirySeconds = 300) {
        const signingKey = this.keyProvider.getSigningKey();
        const now = Math.floor(Date.now() / 1000);
        const tokenId = token_id_generator_1.TokenIdGenerator.generate();
        const payload = {
            iss: this.config.issuer,
            sub: userId,
            jti: tokenId,
            exp: now + expirySeconds,
            iat: now,
            purpose,
        };
        const header = {
            kid: signingKey.kid,
        };
        return jsonwebtoken_1.default.sign(payload, signingKey.privateKey, {
            algorithm: signingKey.algorithm,
            header,
        });
    }
    /**
     * Get token expiry time from payload
     */
    getTokenExpiry(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            return decoded?.exp || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get token ID from payload
     */
    getTokenId(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            return decoded?.jti || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Check if token is expired (without verification)
     */
    isTokenExpired(token) {
        const expiry = this.getTokenExpiry(token);
        if (!expiry)
            return true;
        const now = Math.floor(Date.now() / 1000);
        return now >= expiry;
    }
}
exports.JWTGenerator = JWTGenerator;
//# sourceMappingURL=jwt-generator.js.map