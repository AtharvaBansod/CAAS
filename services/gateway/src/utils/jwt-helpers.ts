/**
 * JWT Helpers
 * Phase 4.5.z.x - Task 04: Public Key Infrastructure Removal
 * 
 * DEPRECATED: Gateway no longer signs/verifies JWTs locally.
 * All token operations are delegated to the Auth Service.
 * These utilities are kept only for backward compatibility during migration.
 */

import jwt from 'jsonwebtoken';

/**
 * @deprecated Use AuthServiceClient.validateToken() instead
 * Gateway should not sign JWTs directly
 */
export const signJwt = (payload: object, options?: any): string => {
  throw new Error(
    'Gateway JWT signing is deprecated. Use Auth Service for token generation.'
  );
};

/**
 * @deprecated Use AuthServiceClient.validateToken() instead
 * Gateway should not verify JWTs directly
 */
export const verifyJwt = <T>(token: string, options?: any): T => {
  throw new Error(
    'Gateway JWT verification is deprecated. Use Auth Service for token validation.'
  );
};

/**
 * Decode JWT without verification (for logging/debugging only)
 * This is safe as it doesn't require keys
 */
export const decodeJwt = (token: string) => {
  return jwt.decode(token);
};
