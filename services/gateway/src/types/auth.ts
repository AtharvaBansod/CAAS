/**
 * Authentication Types
 * Shared types for authentication and authorization
 */

export enum RevocationReason {
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  SECURITY_BREACH = 'SECURITY_BREACH',
  ADMIN_ACTION = 'ADMIN_ACTION',
  TOKEN_REUSE = 'TOKEN_REUSE',
  DEVICE_REMOVED = 'DEVICE_REMOVED',
}

export interface User {
  id: string;
  sub: string;
  tenant_id: string;
  session_id?: string;
  device_id?: string;
  jti?: string;
  scopes?: string[];
  permissions?: string[];
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

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
}

export interface Location {
  country: string;
  city?: string;
}
