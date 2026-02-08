/**
 * Authorization Cache Types
 */

import { AuthorizationDecision } from '../engine/types';

/**
 * Cache key components
 */
export interface CacheKeyComponents {
  tenantId: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
}

/**
 * Cached decision
 */
export interface CachedDecision {
  decision: AuthorizationDecision;
  cached_at: number;
  ttl: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: number;
  total_requests: number;
  avg_lookup_time_ms: number;
}

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  type: 'policy_change' | 'role_change' | 'permission_change' | 'user_change';
  tenant_id?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  timestamp: number;
}
