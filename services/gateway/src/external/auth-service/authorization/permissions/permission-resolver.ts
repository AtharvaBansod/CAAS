/**
 * Permission Resolver
 * 
 * Resolves permission implications and inheritance
 */

import { permissionRegistry } from './permission-registry';

export class PermissionResolver {
  /**
   * Resolve all implied permissions
   */
  resolveImplications(permissions: string[]): string[] {
    const resolved = new Set<string>(permissions);

    for (const permission of permissions) {
      const def = permissionRegistry.get(permission);
      if (def?.implies) {
        for (const implied of def.implies) {
          resolved.add(implied);
          // Recursively resolve
          const subImplied = this.resolveImplications([implied]);
          subImplied.forEach((p) => resolved.add(p));
        }
      }
    }

    return Array.from(resolved);
  }

  /**
   * Expand wildcard permissions
   */
  expandWildcards(permissions: string[]): string[] {
    const expanded = new Set<string>();

    for (const permission of permissions) {
      if (permission.includes('*')) {
        const wildcardExpanded = permissionRegistry.expandWildcard(permission);
        wildcardExpanded.forEach((p) => expanded.add(p));
      } else {
        expanded.add(permission);
      }
    }

    return Array.from(expanded);
  }

  /**
   * Resolve complete permission set
   */
  resolve(permissions: string[]): string[] {
    // First expand wildcards
    const expanded = this.expandWildcards(permissions);
    
    // Then resolve implications
    return this.resolveImplications(expanded);
  }

  /**
   * Check if user has permission (considering implications)
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    const resolved = this.resolve(userPermissions);
    return resolved.includes(requiredPermission);
  }
}

export const permissionResolver = new PermissionResolver();
