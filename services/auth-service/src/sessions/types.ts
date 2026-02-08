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

export const defaultSessionConfig: SessionConfig = {
  ttl_seconds: parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10), // 24 hours
  max_sessions_per_user: parseInt(process.env.MAX_SESSIONS_PER_USER || '10', 10),
  renewal_cooldown_ms: parseInt(process.env.SESSION_RENEWAL_COOLDOWN_MS || '60000', 10), // 1 minute
  max_lifetime_seconds: parseInt(process.env.SESSION_MAX_LIFETIME_SECONDS || '604800', 10), // 7 days
  cleanup_interval_ms: parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS || '300000', 10), // 5 minutes
};
