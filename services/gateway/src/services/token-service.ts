/**
 * Token Service
 * Phase 4.5.z.x - Task 04: Public Key Infrastructure Removal
 * 
 * DEPRECATED: Gateway no longer generates or validates tokens locally.
 * All token operations are delegated to the Auth Service.
 * This file is kept for backward compatibility during migration.
 */

export class TokenService {
  /**
   * @deprecated Use AuthServiceClient via gateway's auth middleware
   */
  generateAccessToken(_payload: any): string {
    throw new Error(
      'Gateway token generation is deprecated. Use Auth Service for token generation.'
    );
  }

  /**
   * @deprecated Use AuthServiceClient via gateway's auth middleware
   */
  generateRefreshToken(_userId: string): string {
    throw new Error(
      'Gateway token generation is deprecated. Use Auth Service for token generation.'
    );
  }

  /**
   * @deprecated Use AuthServiceClient.validateToken() instead
   */
  validateToken(_token: string): any {
    throw new Error(
      'Gateway token validation is deprecated. Use Auth Service for token validation.'
    );
  }

  /**
   * @deprecated Use AuthServiceClient.refreshToken() instead
   */
  async validateRefreshToken(_token: string): Promise<string | null> {
    throw new Error(
      'Gateway refresh token validation is deprecated. Use Auth Service.'
    );
  }

  /**
   * @deprecated Use AuthServiceClient.logout() instead
   */
  async revokeRefreshToken(_token: string): Promise<void> {
    throw new Error(
      'Gateway token revocation is deprecated. Use Auth Service.'
    );
  }
}

export const tokenService = new TokenService();
