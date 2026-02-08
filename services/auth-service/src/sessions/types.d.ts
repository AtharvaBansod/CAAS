/**
 * Session Types
 * Phase 2 - Authentication - Task AUTH-005
 */
export interface Session {
    id: string;
    user_id: string;
    tenant_id: string;
    device_id: string;
    device_info: DeviceInfo;
    ip_address: string;
    location?: Location;
    created_at: number;
    last_activity: number;
    expires_at: number;
    is_active: boolean;
    mfa_verified: boolean;
}
export interface DeviceInfo {
    type: 'web' | 'mobile' | 'desktop' | 'sdk';
    os: string;
    browser?: string;
    app_version?: string;
    user_agent: string;
}
export interface Location {
    country: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
}
export interface SessionData {
    user_id: string;
    tenant_id: string;
    device_id: string;
    device_info: DeviceInfo;
    ip_address: string;
    location?: Location;
    mfa_verified?: boolean;
}
export interface CreateSessionParams {
    user_id: string;
    tenant_id: string;
    device_id: string;
    device_info: DeviceInfo;
    ip_address: string;
    location?: Location;
    ttl_seconds?: number;
}
export interface SessionValidation {
    valid: boolean;
    session?: Session;
    reason?: string;
}
export interface SessionConfig {
    ttl_seconds: number;
    max_sessions_per_user: number;
    renewal_cooldown_ms: number;
    max_lifetime_seconds: number;
    cleanup_interval_ms: number;
}
export declare const defaultSessionConfig: SessionConfig;
