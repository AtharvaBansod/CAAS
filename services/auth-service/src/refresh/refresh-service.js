"use strict";
/**
 * Refresh Service
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Handles token refresh with rotation and reuse detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshService = void 0;
const token_id_generator_1 = require("../tokens/token-id-generator");
class RefreshService {
    jwtGenerator;
    jwtValidator;
    tokenStore;
    familyTracker;
    reuseDetector;
    rotationPolicy;
    constructor(jwtGenerator, jwtValidator, tokenStore, familyTracker, reuseDetector, rotationPolicy) {
        this.jwtGenerator = jwtGenerator;
        this.jwtValidator = jwtValidator;
        this.tokenStore = tokenStore;
        this.familyTracker = familyTracker;
        this.reuseDetector = reuseDetector;
        this.rotationPolicy = rotationPolicy;
    }
    /**
     * Refresh access token using refresh token
     */
    async refresh(refreshToken, user, tenant) {
        try {
            // Validate refresh token
            const payload = await this.jwtValidator.validate(refreshToken, {
                checkRevocation: true,
            });
            // Get token data from store
            const tokenData = await this.tokenStore.get(refreshToken);
            if (!tokenData) {
                return {
                    success: false,
                    error: {
                        code: 'TOKEN_NOT_FOUND',
                        message: 'Refresh token not found',
                    },
                };
            }
            // Detect reuse
            const reuseResult = await this.reuseDetector.detectReuse(refreshToken, tokenData);
            if (reuseResult.isReuse) {
                await this.reuseDetector.handleReuse(refreshToken, tokenData, reuseResult);
                return {
                    success: false,
                    error: {
                        code: 'TOKEN_REUSE_DETECTED',
                        message: 'Refresh token reuse detected. All tokens revoked.',
                    },
                };
            }
            // Mark current token as used
            await this.tokenStore.markAsUsed(refreshToken);
            // Generate new token pair
            const newTokenPair = await this.generateNewTokenPair(user, tenant, tokenData);
            // If rotation is enabled, invalidate old refresh token
            if (this.rotationPolicy.isRotationEnabled()) {
                await this.tokenStore.revoke(refreshToken);
            }
            return {
                success: true,
                tokens: newTokenPair,
            };
        }
        catch (error) {
            return {
                success: false,
                error: {
                    code: 'REFRESH_FAILED',
                    message: error.message || 'Token refresh failed',
                },
            };
        }
    }
    /**
     * Generate new token pair during refresh
     */
    async generateNewTokenPair(user, tenant, oldTokenData) {
        // Generate new access token
        const tokenPair = await this.jwtGenerator.generateAccessToken({
            user,
            tenant,
            scopes: [], // TODO: Get from user/session
            sessionId: oldTokenData.session_id,
            deviceId: oldTokenData.device_id,
        });
        // If rotation enabled, store new refresh token
        if (this.rotationPolicy.isRotationEnabled()) {
            const newRefreshTokenId = token_id_generator_1.TokenIdGenerator.generateRefreshTokenId();
            const newTokenData = {
                user_id: oldTokenData.user_id,
                session_id: oldTokenData.session_id,
                device_id: oldTokenData.device_id,
                family_id: oldTokenData.family_id,
                parent_id: oldTokenData.issued_at.toString(),
                issued_at: Math.floor(Date.now() / 1000),
                expires_at: Math.floor(Date.now() / 1000) + tokenPair.refresh_expires_in,
                used: false,
                revoked: false,
            };
            // Store new refresh token
            await this.tokenStore.store(tokenPair.refresh_token, newTokenData, tokenPair.refresh_expires_in);
            // Add to family
            await this.familyTracker.addTokenToFamily(oldTokenData.family_id, newRefreshTokenId);
        }
        return tokenPair;
    }
    /**
     * Revoke specific refresh token
     */
    async revokeRefreshToken(tokenId) {
        // TODO: Implement token lookup by ID and revocation
    }
    /**
     * Revoke all user's refresh tokens
     */
    async revokeAllUserTokens(userId) {
        await this.tokenStore.revokeAllUserTokens(userId);
    }
    /**
     * Revoke all session's refresh tokens
     */
    async revokeAllSessionTokens(sessionId) {
        // TODO: Implement session-based token lookup and revocation
    }
    /**
     * Create initial refresh token (during login)
     */
    async createInitialRefreshToken(refreshToken, userId, sessionId, deviceId, expiresIn) {
        // Create new token family
        const tokenId = token_id_generator_1.TokenIdGenerator.generateRefreshTokenId();
        const familyId = await this.familyTracker.createFamily(userId, tokenId);
        const tokenData = {
            user_id: userId,
            session_id: sessionId,
            device_id: deviceId,
            family_id: familyId,
            parent_id: null, // First token in family
            issued_at: Math.floor(Date.now() / 1000),
            expires_at: Math.floor(Date.now() / 1000) + expiresIn,
            used: false,
            revoked: false,
        };
        await this.tokenStore.store(refreshToken, tokenData, expiresIn);
    }
    /**
     * Get refresh token info
     */
    async getTokenInfo(refreshToken) {
        return await this.tokenStore.get(refreshToken);
    }
    /**
     * Check if refresh token is valid
     */
    async isValid(refreshToken) {
        const tokenData = await this.tokenStore.get(refreshToken);
        if (!tokenData) {
            return false;
        }
        if (tokenData.revoked || tokenData.used) {
            return false;
        }
        const now = Math.floor(Date.now() / 1000);
        if (now >= tokenData.expires_at) {
            return false;
        }
        return true;
    }
}
exports.RefreshService = RefreshService;
//# sourceMappingURL=refresh-service.js.map