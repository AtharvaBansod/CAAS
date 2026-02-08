/**
 * JWT Claim Validators
 * Phase 2 - Authentication - Task AUTH-002
 */

import { JWTConfig } from './jwt-config';
import { TokenClaimError, TokenExpiredError } from './validation-errors';

export class ClaimValidator {
  constructor(private config: JWTConfig) {}

  /**
   * Validate issuer claim
   */
  validateIssuer(iss: string | undefined): void {
    if (!iss) {
      throw new TokenClaimError('Missing "iss" (issuer) claim', 'iss');
    }

    if (iss !== this.config.issuer) {
      throw new TokenClaimError(
        `Invalid issuer. Expected "${this.config.issuer}", got "${iss}"`,
        'iss'
      );
    }
  }

  /**
   * Validate audience claim
   */
  validateAudience(aud: string | undefined, expectedAudience?: string): void {
    if (!aud) {
      throw new TokenClaimError('Missing "aud" (audience) claim', 'aud');
    }

    if (expectedAudience && aud !== expectedAudience) {
      throw new TokenClaimError(
        `Invalid audience. Expected "${expectedAudience}", got "${aud}"`,
        'aud'
      );
    }
  }

  /**
   * Validate expiration with clock tolerance
   */
  validateExpiration(exp: number | undefined): void {
    if (!exp) {
      throw new TokenClaimError('Missing "exp" (expiration) claim', 'exp');
    }

    if (typeof exp !== 'number') {
      throw new TokenClaimError('Expiration claim must be a number', 'exp');
    }

    const now = Math.floor(Date.now() / 1000);
    const expirationWithTolerance = exp + this.config.clockTolerance;

    if (now >= expirationWithTolerance) {
      const expiredAt = new Date(exp * 1000).toISOString();
      throw new TokenExpiredError(`Token expired at ${expiredAt}`);
    }
  }

  /**
   * Validate issued-at claim (reject future tokens)
   */
  validateIssuedAt(iat: number | undefined): void {
    if (!iat) {
      throw new TokenClaimError('Missing "iat" (issued at) claim', 'iat');
    }

    if (typeof iat !== 'number') {
      throw new TokenClaimError('Issued at claim must be a number', 'iat');
    }

    const now = Math.floor(Date.now() / 1000);
    const issuedAtWithTolerance = iat - this.config.clockTolerance;

    // Reject tokens issued in the future
    if (issuedAtWithTolerance > now) {
      throw new TokenClaimError(
        'Token issued in the future',
        'iat'
      );
    }
  }

  /**
   * Validate subject claim
   */
  validateSubject(sub: string | undefined): void {
    if (!sub) {
      throw new TokenClaimError('Missing "sub" (subject) claim', 'sub');
    }

    if (typeof sub !== 'string' || sub.trim() === '') {
      throw new TokenClaimError('Subject claim must be a non-empty string', 'sub');
    }
  }

  /**
   * Validate JWT ID claim
   */
  validateJwtId(jti: string | undefined): void {
    if (!jti) {
      throw new TokenClaimError('Missing "jti" (JWT ID) claim', 'jti');
    }

    if (typeof jti !== 'string' || jti.trim() === '') {
      throw new TokenClaimError('JWT ID claim must be a non-empty string', 'jti');
    }
  }

  /**
   * Validate required claims are present
   */
  validateRequiredClaims(payload: any, requiredClaims: string[]): void {
    for (const claim of requiredClaims) {
      if (!(claim in payload)) {
        throw new TokenClaimError(`Missing required claim: ${claim}`, claim);
      }
    }
  }

  /**
   * Validate standard JWT claims
   */
  validateStandardClaims(payload: any, expectedAudience?: string): void {
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
  validateAccessTokenClaims(payload: any): void {
    const requiredClaims = ['tenant_id', 'user_id', 'scopes', 'permissions', 'session_id'];
    this.validateRequiredClaims(payload, requiredClaims);

    // Validate scopes is an array
    if (!Array.isArray(payload.scopes)) {
      throw new TokenClaimError('Scopes must be an array', 'scopes');
    }

    // Validate permissions is an array
    if (!Array.isArray(payload.permissions)) {
      throw new TokenClaimError('Permissions must be an array', 'permissions');
    }

    // Validate tenant_id and user_id match sub and aud
    if (payload.user_id !== payload.sub) {
      throw new TokenClaimError('user_id must match sub claim', 'user_id');
    }

    if (payload.tenant_id !== payload.aud) {
      throw new TokenClaimError('tenant_id must match aud claim', 'tenant_id');
    }
  }

  /**
   * Validate not before claim (if present)
   */
  validateNotBefore(nbf: number | undefined): void {
    if (!nbf) return; // Optional claim

    if (typeof nbf !== 'number') {
      throw new TokenClaimError('Not before claim must be a number', 'nbf');
    }

    const now = Math.floor(Date.now() / 1000);
    const notBeforeWithTolerance = nbf - this.config.clockTolerance;

    if (now < notBeforeWithTolerance) {
      const notBeforeDate = new Date(nbf * 1000).toISOString();
      throw new TokenClaimError(
        `Token not valid before ${notBeforeDate}`,
        'nbf'
      );
    }
  }
}
