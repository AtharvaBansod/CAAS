/**
 * Permission Registry
 * 
 * Central registry for all platform permissions
 */

import { PermissionDefinition } from './types';

export class PermissionRegistry {
  private permissions: Map<string, PermissionDefinition>;

  constructor() {
    this.permissions = new Map();
  }

  /**
   * Register a permission
   */
  register(permission: PermissionDefinition): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * Register multiple permissions
   */
  registerMany(permissions: PermissionDefinition[]): void {
    for (const permission of permissions) {
      this.register(permission);
    }
  }

  /**
   * Get permission by ID
   */
  get(permissionId: string): PermissionDefinition | null {
    return this.permissions.get(permissionId) || null;
  }

  /**
   * Get all permissions for a resource type
   */
  getByResource(resourceType: string): PermissionDefinition[] {
    return Array.from(this.permissions.values()).filter(
      (p) => p.resource === resourceType
    );
  }

  /**
   * Get all permissions
   */
  getAll(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Validate permission exists
   */
  validate(permissionId: string): boolean {
    return this.permissions.has(permissionId);
  }

  /**
   * Expand wildcard permission
   */
  expandWildcard(pattern: string): string[] {
    if (!pattern.includes('*')) {
      return [pattern];
    }

    const [resource, action] = pattern.split('.');
    
    if (action === '*') {
      // Expand to all actions for resource
      return this.getByResource(resource).map((p) => p.id);
    }

    return [pattern];
  }
}

export const permissionRegistry = new PermissionRegistry();
