/**
 * Authorization Audit Types
 */

/**
 * Authorization audit entry
 */
export interface AuthzAuditEntry {
  id: string;
  timestamp: Date;
  request_id?: string;
  tenant_id: string;
  subject: {
    user_id: string;
    roles: string[];
  };
  resource: {
    type: string;
    id?: string;
  };
  action: string;
  decision: 'allow' | 'deny';
  matched_policies?: string[];
  reason?: string;
  duration_ms: number;
  cache_hit: boolean;
}

/**
 * Policy change entry
 */
export interface PolicyChangeEntry {
  id: string;
  timestamp: Date;
  policy_id: string;
  policy_name: string;
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  actor: string;
  changes?: Record<string, any>;
  reason?: string;
}

/**
 * Role change entry
 */
export interface RoleChangeEntry {
  id: string;
  timestamp: Date;
  user_id: string;
  role: string;
  action: 'grant' | 'revoke';
  actor: string;
  scope?: {
    type: 'global' | 'resource';
    resource_type?: string;
    resource_id?: string;
  };
  expires_at?: Date;
  reason?: string;
}

/**
 * Audit query filters
 */
export interface AuditQueryFilters {
  tenant_id?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action?: string;
  decision?: 'allow' | 'deny';
  start_date?: Date;
  end_date?: Date;
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  entries: AuthzAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Audit statistics
 */
export interface AuditStatistics {
  total_decisions: number;
  allow_count: number;
  deny_count: number;
  allow_rate: number;
  deny_rate: number;
  avg_duration_ms: number;
  cache_hit_rate: number;
  top_denied_actions: Array<{ action: string; count: number }>;
  top_denied_users: Array<{ user_id: string; count: number }>;
}
