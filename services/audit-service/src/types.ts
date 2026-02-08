/**
 * Audit Service Types
 */

export interface AuditEvent {
  event_type: string;
  actor: {
    user_id?: string;
    ip_address: string;
    user_agent: string;
    session_id?: string;
  };
  target: {
    type: string;
    id: string;
  };
  action: string;
  result: 'success' | 'failure';
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface AuditEntry extends AuditEvent {
  _id?: unknown;
  audit_id: string;
  tenant_id: string;
  hash: string;
  previous_hash?: string;
  created_at: Date;
}

export interface AuditFilter {
  tenant_id?: string;
  event_type?: string;
  actor_user_id?: string;
  target_type?: string;
  target_id?: string;
  action?: string;
  result?: 'success' | 'failure';
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  has_more: boolean;
}

export interface AuditStats {
  total_events: number;
  by_event_type: Record<string, number>;
  by_result: Record<string, number>;
  by_actor: Record<string, number>;
  time_range: {
    start: Date;
    end: Date;
  };
}

export type SecurityEventType =
  | 'authentication.login'
  | 'authentication.logout'
  | 'authentication.failed_login'
  | 'authentication.password_change'
  | 'authorization.access_granted'
  | 'authorization.access_denied'
  | 'authorization.role_change'
  | 'data.read'
  | 'data.write'
  | 'data.delete'
  | 'data.export'
  | 'admin.user_create'
  | 'admin.user_delete'
  | 'admin.settings_change'
  | 'security.mfa_enabled'
  | 'security.mfa_disabled'
  | 'security.api_key_created'
  | 'security.api_key_revoked';
