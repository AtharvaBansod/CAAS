/**
 * Role System Types
 */

/**
 * Role definition
 */
export interface Role {
  _id?: string;
  id: string;
  name: string;
  description: string;
  tenant_id: string | null; // null for system roles
  is_system: boolean;
  permissions: string[];
  inherits?: string[]; // Inherit from other roles
  metadata: {
    created_at: Date;
    updated_at: Date;
    created_by: string;
  };
}

/**
 * Role assignment
 */
export interface RoleAssignment {
  _id?: string;
  user_id: string;
  role_id: string;
  tenant_id: string;
  scope: 'global' | 'resource';
  resource_type?: string;
  resource_id?: string;
  expires_at?: Date;
  granted_by: string;
  granted_at: Date;
}

/**
 * Create role DTO
 */
export interface CreateRoleDTO {
  name: string;
  description: string;
  tenant_id: string | null;
  permissions: string[];
  inherits?: string[];
}

/**
 * Update role DTO
 */
export interface UpdateRoleDTO {
  name?: string;
  description?: string;
  permissions?: string[];
  inherits?: string[];
}
