/**
 * JWT Token Types and Interfaces
 * Phase 2 - Authentication - Task AUTH-001
 */
export interface User {
    id: string;
    email: string;
    tenant_id: string;
    roles?: string[];
}
export interface Tenant {
    id: string;
    name: string;
    settings?: Record<string, any>;
}
export interface TokenPair {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    refresh_expires_in: number;
}
export interface AccessTokenPayload {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    jti: string;
    tenant_id: string;
    user_id: string;
    scopes: string[];
    permissions: string[];
    device_id?: string;
    session_id: string;
}
export interface RefreshTokenPayload {
    iss: string;
    sub: string;
    jti: string;
    exp: number;
    iat: number;
    token_type: 'refresh';
}
export interface ServiceTokenPayload {
    iss: string;
    sub: string;
    jti: string;
    exp: number;
    iat: number;
    service: string;
    token_type: 'service';
}
export interface JWTHeader {
    alg: 'RS256' | 'ES256';
    typ: 'JWT';
    kid: string;
}
export interface GenerateAccessTokenParams {
    user: User;
    tenant: Tenant;
    scopes: string[];
    deviceId?: string;
    sessionId: string;
    permissions?: string[];
}
export type JWTAlgorithm = 'RS256' | 'ES256';
export interface SigningKey {
    kid: string;
    algorithm: JWTAlgorithm;
    privateKey: string;
    publicKey: string;
    createdAt: Date;
    expiresAt?: Date;
    isActive: boolean;
}
export interface KeyRotationConfig {
    enabled: boolean;
    rotationIntervalDays: number;
    gracePeriodDays: number;
}
