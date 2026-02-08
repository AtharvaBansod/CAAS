/**
 * Resource Permission Types
 */

/**
 * Resource permission
 */
export interface ResourcePermission {
  _id?: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  permissions: string[];
  granted_by: string;
  granted_at: Date;
  expires_at?: Date;
}

/**
 * Grant permission parameters
 */
export interface GrantParams {
  user_id: string;
  resource_type: string;
  resource_id: string;
  permissions: string[];
  granted_by: string;
  expires_at?: Date;
}

/**
 * Revoke permission parameters
 */
export interface RevokeParams {
  user_id: string;
  resource_type: string;
  resource_id: string;
}

/**
 * Check permission parameters
 */
export interface CheckParams {
  user_id: string;
  resource_type: string;
  resource_id: string;
  permission: string;
}

/**
 * Permission template
 */
export interface PermissionTemplate {
  name: string;
  description: string;
  permissions: string[];
}
