/**
 * Role Service
 * 
 * Business logic for role management
 */

import { RoleRepository } from './role-repository';
import { Role, CreateRoleDTO, UpdateRoleDTO } from './types';
import { permissionRegistry } from '../permissions/permission-registry';

export class RoleService {
  constructor(private repository: RoleRepository) {}

  /**
   * Create a role
   */
  async create(dto: CreateRoleDTO, createdBy: string): Promise<Role> {
    // Validate permissions exist
    for (const permission of dto.permissions) {
      if (!permission.includes('*') && !permissionRegistry.validate(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }

    return await this.repository.create(dto, createdBy);
  }

  /**
   * Get role by ID
   */
  async getById(id: string): Promise<Role | null> {
    return await this.repository.getById(id);
  }

  /**
   * Get roles by tenant
   */
  async getByTenant(tenantId: string): Promise<Role[]> {
    return await this.repository.getByTenant(tenantId);
  }

  /**
   * Update role
   */
  async update(id: string, dto: UpdateRoleDTO, updatedBy: string): Promise<Role> {
    // Validate permissions if provided
    if (dto.permissions) {
      for (const permission of dto.permissions) {
        if (!permission.includes('*') && !permissionRegistry.validate(permission)) {
          throw new Error(`Invalid permission: ${permission}`);
        }
      }
    }

    return await this.repository.update(id, dto, updatedBy);
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }

  /**
   * Get effective permissions for role (including inherited)
   */
  async getEffectivePermissions(roleId: string): Promise<string[]> {
    const role = await this.getById(roleId);
    if (!role) {
      return [];
    }

    const permissions = new Set<string>(role.permissions);

    // Add inherited permissions
    if (role.inherits) {
      for (const inheritedRoleId of role.inherits) {
        const inheritedPerms = await this.getEffectivePermissions(inheritedRoleId);
        inheritedPerms.forEach((p) => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }
}
