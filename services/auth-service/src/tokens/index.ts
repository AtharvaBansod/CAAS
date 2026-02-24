/**
 * Tokens Module - Public API
 * Phase 2 - Authentication - Tasks AUTH-001 to AUTH-004
 * 
 * @deprecated Phase 4.5.z.x: This entire module is DEPRECATED.
 * Token generation and validation now uses services/token.service.ts with HMAC (HS256).
 * The key-provider.ts and jwt-generator/validator using RSA keys are no longer used.
 * This module is kept for reference only and will be removed in a future cleanup.
 */

export * from './types';
export * from './jwt-config';
export * from './jwt-generator';
export * from './jwt-validator';
export * from './key-provider';
export * from './token-id-generator';
export * from './claim-validators';
export * from './revocation-checker';
export * from './security-checks';
export * from './validation-errors';
