/**
 * Revocation Types
 * Phase 2 - Authentication - Task AUTH-004
 */

export enum RevocationReason {
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  SECURITY_BREACH = 'SECURITY_BREACH',
  ADMIN_ACTION = 'ADMIN_ACTION',
  TOKEN_REUSE = 'TOKEN_REUSE',
  DEVICE_REMOVED = 'DEVICE_REMOVED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  USER_DELETED = 'USER_DELETED',
  TENANT_SUSPENDED = 'TENANT_SUSPENDED',
}

export interface RevocationEvent {
  event_type: 'token.revoked' | 'user.tokens.revoked' | 'session.terminated' | 'tenant.tokens.revoked';
  timestamp: number;
  reason: RevocationReason;
  metadata: {
    token_id?: string;
    user_id?: string;
    session_id?: string;
    tenant_id?: string;
    revoked_by?: string;
    ip_address?: string;
  };
}

export interface RevocationResult {
  success: boolean;
  revoked_count: number;
  reason: RevocationReason;
  timestamp: number;
}
