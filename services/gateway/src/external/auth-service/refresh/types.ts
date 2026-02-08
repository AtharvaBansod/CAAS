/**
 * Refresh Token Types
 * Phase 2 - Authentication - Task AUTH-003
 */

export interface RefreshTokenData {
  user_id: string;
  session_id: string;
  device_id: string;
  family_id: string;  // For rotation tracking
  parent_id: string | null;  // Previous token in chain
  issued_at: number;
  expires_at: number;
  used: boolean;
  revoked: boolean;
}

export interface RefreshTokenFamily {
  family_id: string;
  user_id: string;
  created_at: number;
  tokens: string[];  // Token IDs in the family
  revoked: boolean;
}

export interface RefreshResult {
  success: boolean;
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_expires_in: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RotationPolicy {
  enabled: boolean;
  reuseDetection: boolean;
  revokeFamily: boolean;
}

export const defaultRotationPolicy: RotationPolicy = {
  enabled: process.env.REFRESH_TOKEN_ROTATION !== 'false',
  reuseDetection: process.env.REFRESH_TOKEN_REUSE_DETECTION !== 'false',
  revokeFamily: true,
};
