/**
 * Refresh Service
 * Phase 2 - Authentication - Task AUTH-003
 * 
 * Handles token refresh with rotation and reuse detection
 */

import { JWTGenerator } from '../tokens/jwt-generator';
import { JWTValidator } from '../tokens/jwt-validator';
import { TokenIdGenerator } from '../tokens/token-id-generator';
import { RefreshTokenStore } from './refresh-token-store';
import { FamilyTracker } from './family-tracker';
import { ReuseDetector } from './reuse-detection';
import { TokenRotationPolicy } from './rotation-policy';
import { RefreshTokenData, RefreshResult } from './types';
import { User, Tenant, TokenPair } from '../tokens/types';

export class RefreshService {
  constructor(
    private jwtGenerator: JWTGenerator,
    private jwtValidator: JWTValidator,
    private tokenStore: RefreshTokenStore,
    private familyTracker: FamilyTracker,
    private reuseDetector: ReuseDetector,
    private rotationPolicy: TokenRotationPolicy
  ) {}

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string, user: User, tenant: Tenant): Promise<RefreshResult> {
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
    } catch (error: any) {
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
  private async generateNewTokenPair(
    user: User,
    tenant: Tenant,
    oldTokenData: RefreshTokenData
  ): Promise<TokenPair> {
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
      const newRefreshTokenId = TokenIdGenerator.generateRefreshTokenId();
      const newTokenData: RefreshTokenData = {
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
      await this.tokenStore.store(
        tokenPair.refresh_token,
        newTokenData,
        tokenPair.refresh_expires_in
      );

      // Add to family
      await this.familyTracker.addTokenToFamily(oldTokenData.family_id, newRefreshTokenId);
    }

    return tokenPair;
  }

  /**
   * Revoke specific refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    // TODO: Implement token lookup by ID and revocation
  }

  /**
   * Revoke all user's refresh tokens
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenStore.revokeAllUserTokens(userId);
  }

  /**
   * Revoke all session's refresh tokens
   */
  async revokeAllSessionTokens(sessionId: string): Promise<void> {
    // TODO: Implement session-based token lookup and revocation
  }

  /**
   * Create initial refresh token (during login)
   */
  async createInitialRefreshToken(
    refreshToken: string,
    userId: string,
    sessionId: string,
    deviceId: string,
    expiresIn: number
  ): Promise<void> {
    // Create new token family
    const tokenId = TokenIdGenerator.generateRefreshTokenId();
    const familyId = await this.familyTracker.createFamily(userId, tokenId);

    const tokenData: RefreshTokenData = {
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
  async getTokenInfo(refreshToken: string): Promise<RefreshTokenData | null> {
    return await this.tokenStore.get(refreshToken);
  }

  /**
   * Check if refresh token is valid
   */
  async isValid(refreshToken: string): Promise<boolean> {
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
