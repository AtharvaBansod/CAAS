/**
 * Authorization Storage Types
 * 
 * Type definitions for policy storage, versioning, and management
 */

import { Policy, PolicyEffect, PolicyTarget, Condition as PolicyCondition } from '../engine/types';

/**
 * Stored policy with metadata
 */
export interface StoredPolicy extends Policy {
  _id?: string;
  tenant_id: string | null; // null for global policies
  version: number;
  is_active: boolean;
  metadata: PolicyMetadata;
}

/**
 * Policy metadata
 */
export interface PolicyMetadata {
  created_by: string;
  created_at: Date;
  updated_at: Date;
  updated_by?: string;
  tags?: string[];
  notes?: string;
}

/**
 * Policy version history entry
 */
export interface PolicyVersion {
  _id?: string;
  policy_id: string;
  version: number;
  policy: Policy;
  metadata: PolicyMetadata;
  change_reason?: string;
  changed_by: string;
  changed_at: Date;
}

/**
 * Policy query filters
 */
export interface PolicyQueryFilters {
  tenant_id?: string | null;
  is_active?: boolean;
  effect?: PolicyEffect;
  tags?: string[];
  created_after?: Date;
  created_before?: Date;
  search?: string; // Search in name/description
}

/**
 * Policy list options
 */
export interface PolicyListOptions {
  filters?: PolicyQueryFilters;
  sort?: {
    field: 'name' | 'priority' | 'created_at' | 'updated_at';
    order: 'asc' | 'desc';
  };
  limit?: number;
  offset?: number;
}

/**
 * Policy list result
 */
export interface PolicyListResult {
  policies: StoredPolicy[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Default policy definition
 */
export interface DefaultPolicy {
  name: string;
  description: string;
  effect: PolicyEffect;
  priority: number;
  target: PolicyTarget;
  conditions?: PolicyCondition[];
  tags: string[];
}

/**
 * Policy repository interface
 */
export interface IPolicyRepository {
  create(policy: Omit<StoredPolicy, '_id' | 'version' | 'metadata'>, createdBy: string): Promise<StoredPolicy>;
  findById(id: string): Promise<StoredPolicy | null>;
  findByTenant(tenantId: string | null, options?: PolicyListOptions): Promise<PolicyListResult>;
  update(id: string, updates: Partial<Policy>, updatedBy: string, changeReason?: string): Promise<StoredPolicy>;
  delete(id: string): Promise<boolean>;
  activate(id: string): Promise<boolean>;
  deactivate(id: string): Promise<boolean>;
  getVersionHistory(policyId: string): Promise<PolicyVersion[]>;
  rollback(policyId: string, version: number, rolledBackBy: string): Promise<StoredPolicy>;
  getApplicablePolicies(tenantId: string | null): Promise<StoredPolicy[]>;
}
