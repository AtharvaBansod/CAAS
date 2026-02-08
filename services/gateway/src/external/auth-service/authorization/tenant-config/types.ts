/**
 * Tenant Configuration Types
 */

/**
 * Permission configuration for tenant
 */
export interface PermissionConfig {
  _id?: string;
  tenant_id: string;
  default_role: string;
  default_roles: string[];
  auto_permissions: AutoPermissionRule[];
  restriction_rules: RestrictionRule[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Auto-permission rule
 */
export interface AutoPermissionRule {
  name: string;
  condition: {
    attribute: string;
    operator: 'equals' | 'contains' | 'matches';
    value: any;
  };
  grant: string[];
}

/**
 * Restriction rule
 */
export interface RestrictionRule {
  name: string;
  resource_type: string;
  action: string;
  requires_approval: boolean;
  time_restrictions?: {
    start_time: string;
    end_time: string;
    days: string[];
  };
}
