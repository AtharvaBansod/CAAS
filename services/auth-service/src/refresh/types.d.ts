/**
 * Refresh Token Types
 * Phase 2 - Authentication - Task AUTH-003
 */
export interface RefreshTokenData {
    user_id: string;
    session_id: string;
    device_id: string;
    family_id: string;
    parent_id: string | null;
    issued_at: number;
    expires_at: number;
    used: boolean;
    revoked: boolean;
}
export interface RefreshTokenFamily {
    family_id: string;
    user_id: string;
    created_at: number;
    tokens: string[];
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
export declare const defaultRotationPolicy: RotationPolicy;
