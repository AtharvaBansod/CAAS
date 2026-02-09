/**
 * JWT Token Generator
 * Phase 2 - Authentication - Task AUTH-001
 * 
 * Generates JWT tokens with RS256/ES256 algorithms
 * Supports access tokens, refresh tokens, and service tokens
 */

import jwt from 'jsonwebtoken';
import { KeyProvider } from './key-provider';
import { JWTConfig } from './jwt-config';
import { TokenIdGenerator } from './token-id-generator';
import {
  TokenPair,
  AccessTokenPayload,
  RefreshTokenPayload,
  ServiceTokenPayload,
  GenerateAccessTokenParams,
  JWTHeader,
} from './types';

export class JWTGenerator {
  constructor(
    private keyProvider: KeyProvider,
    private config: JWTConfig
  ) {}

  /**
   * Generate access and refresh token pair
   */
  async generateAccessToken(params: GenerateAccessTokenParams): Promise<TokenPair> {
    const { user, tenant, scopes, deviceId, sessionId, permissions = [] } = params;

    // Get signing key
    const signingKey = this.keyProvider.getSigningKey(tenant.id);

    // Generate token IDs
    const accessTokenId = TokenIdGenerator.generateAccessTokenId();
    const refreshTokenId = TokenIdGenerator.generateRefreshTokenId();

    // Current timestamp
    const now = Math.floor(Date.now() / 1000);

    // Access token payload
    const accessPayload: AccessTokenPayload = {
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
    const refreshPayload: RefreshTokenPayload = {
      iss: this.config.issuer,
      sub: user.id,
      jti: refreshTokenId,
      exp: now + this.config.refreshTokenExpiry,
      iat: now,
      token_type: 'refresh',
    };

    // JWT header with key ID
    const header: JWTHeader = {
      kid: signingKey.kid,
      alg: signingKey.algorithm,
      typ: 'JWT',
    };

    // Sign tokens
    const accessToken = jwt.sign(accessPayload, signingKey.privateKey, {
      header,
    });

    const refreshToken = jwt.sign(refreshPayload, signingKey.privateKey, {
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
  async generateRefreshToken(userId: string, tokenId: string): Promise<string> {
    const signingKey = this.keyProvider.getSigningKey();
    const now = Math.floor(Date.now() / 1000);

    const payload: RefreshTokenPayload = {
      iss: this.config.issuer,
      sub: userId,
      jti: tokenId,
      exp: now + this.config.refreshTokenExpiry,
      iat: now,
      token_type: 'refresh',
    };

    const header: JWTHeader = {
      kid: signingKey.kid,
      alg: signingKey.algorithm,
      typ: 'JWT',
    };

    return jwt.sign(payload, signingKey.privateKey, {
      header,
    });
  }

  /**
   * Generate service-to-service token
   */
  async generateServiceToken(service: string): Promise<string> {
    const signingKey = this.keyProvider.getSigningKey();
    const now = Math.floor(Date.now() / 1000);
    const tokenId = TokenIdGenerator.generateServiceTokenId();

    const payload: ServiceTokenPayload = {
      iss: this.config.issuer,
      sub: service,
      jti: tokenId,
      exp: now + this.config.serviceTokenExpiry,
      iat: now,
      service,
      token_type: 'service',
    };

    const header: JWTHeader = {
      kid: signingKey.kid,
      alg: signingKey.algorithm,
      typ: 'JWT',
    };

    return jwt.sign(payload, signingKey.privateKey, {
      header,
    });
  }

  /**
   * Generate short-lived token for specific purpose
   */
  async generateShortLivedToken(
    userId: string,
    purpose: string,
    expirySeconds: number = 300
  ): Promise<string> {
    const signingKey = this.keyProvider.getSigningKey();
    const now = Math.floor(Date.now() / 1000);
    const tokenId = TokenIdGenerator.generate();

    const payload = {
      iss: this.config.issuer,
      sub: userId,
      jti: tokenId,
      exp: now + expirySeconds,
      iat: now,
      purpose,
    };

    const header: JWTHeader = {
      kid: signingKey.kid,
      alg: signingKey.algorithm,
      typ: 'JWT',
    };

    return jwt.sign(payload, signingKey.privateKey, {
      header,
    });
  }

  /**
   * Get token expiry time from payload
   */
  getTokenExpiry(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp || null;
    } catch {
      return null;
    }
  }

  /**
   * Get token ID from payload
   */
  getTokenId(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.jti || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired (without verification)
   */
  isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return now >= expiry;
  }
}
