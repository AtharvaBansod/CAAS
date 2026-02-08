/**
 * JWT Token Validator
 * Phase 2 - Authentication - Task AUTH-002
 * 
 * Comprehensive JWT validation with signature verification,
 * claim validation, and revocation checking
 */

import jwt from 'jsonwebtoken';
import { KeyProvider } from './key-provider';
import { JWTConfig } from './jwt-config';
import { ClaimValidator } from './claim-validators';
import { RevocationChecker } from './revocation-checker';
import { SecurityChecker } from './security-checks';
import {
  TokenValidationError,
  TokenExpiredError,
  TokenSignatureError,
  TokenRevokedError,
  TokenMalformedError,
} from './validation-errors';
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

export class JWTValidator {
  private claimValidator: ClaimValidator;
  private securityChecker: SecurityChecker;

  constructor(
    private keyProvider: KeyProvider,
    private config: JWTConfig,
    private revocationChecker?: RevocationChecker
  ) {
    this.claimValidator = new ClaimValidator(config);
    this.securityChecker = new SecurityChecker();
  }

  /**
   * Validate and decode JWT token
   */
  async validate(token: string, options: ValidateOptions = {}): Promise<TokenPayload> {
    try {
      // Perform security checks
      const header = this.securityChecker.performSecurityChecks(token);

      // Get public key for verification
      const publicKey = this.keyProvider.getPublicKey(header.kid || '');
      if (!publicKey) {
        throw new TokenSignatureError(`Unknown key ID: ${header.kid}`);
      }

      // Verify signature and decode
      const payload = jwt.verify(token, publicKey, {
        algorithms: [header.alg as any],
        clockTolerance: this.config.clockTolerance,
      }) as TokenPayload;

      // Validate standard claims
      this.claimValidator.validateStandardClaims(payload, options.audience);

      // Validate access token specific claims if required
      if (options.requireAccessTokenClaims) {
        this.claimValidator.validateAccessTokenClaims(payload);
      }

      // Check revocation if enabled
      if (options.checkRevocation !== false && this.revocationChecker) {
        const revocationResult = await this.revocationChecker.isRevoked(
          payload.jti,
          payload.user_id || payload.sub,
          payload.session_id,
          payload.iat
        );

        if (revocationResult.revoked) {
          throw new TokenRevokedError(
            `Token revoked: ${revocationResult.reason}`
          );
        }
      }

      return payload;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof TokenValidationError) {
        throw error;
      }

      // Handle jsonwebtoken errors
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        if (error.message.includes('invalid signature')) {
          throw new TokenSignatureError('Invalid token signature');
        }
        throw new TokenMalformedError(error.message);
      }

      // Unknown error
      throw new TokenValidationError(
        'Token validation failed',
        'VALIDATION_ERROR',
        500
      );
    }
  }

  /**
   * Validate and decode token with full details
   */
  async validateAndDecode(token: string, options: ValidateOptions = {}): Promise<DecodedToken> {
    const payload = await this.validate(token, options);
    
    // Decode header
    const headerPart = token.split('.')[0];
    const headerJson = Buffer.from(headerPart, 'base64').toString('utf8');
    const header = JSON.parse(headerJson) as JWTHeader;

    return { header, payload };
  }

  /**
   * Check if token is expired (without full validation)
   */
  isExpired(payload: TokenPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now >= payload.exp;
  }

  /**
   * Check if token is revoked
   */
  async isRevoked(tokenId: string, userId: string, sessionId: string, issuedAt: number): Promise<boolean> {
    if (!this.revocationChecker) {
      return false;
    }

    const result = await this.revocationChecker.isRevoked(tokenId, userId, sessionId, issuedAt);
    return result.revoked;
  }

  /**
   * Decode token without verification (use with caution)
   */
  decodeWithoutVerification(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  getExpiry(token: string): Date | null {
    const payload = this.decodeWithoutVerification(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }

  /**
   * Get time until token expires
   */
  getTimeUntilExpiry(token: string): number | null {
    const expiry = this.getExpiry(token);
    if (!expiry) {
      return null;
    }
    return Math.max(0, expiry.getTime() - Date.now());
  }

  /**
   * Validate token format without cryptographic verification
   */
  static isValidFormat(token: string): boolean {
    return SecurityChecker.isValidTokenFormat(token);
  }

  /**
   * Extract claims from token without verification
   */
  extractClaims(token: string): Partial<TokenPayload> | null {
    try {
      const payload = this.decodeWithoutVerification(token);
      if (!payload) return null;

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
    } catch {
      return null;
    }
  }
}
