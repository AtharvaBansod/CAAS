/**
 * Permission Hierarchy
 * 
 * Defines resource hierarchy for permission propagation
 */

import { PermissionHierarchyLevel } from './types';

export class PermissionHierarchy {
  private hierarchy: Map<string, PermissionHierarchyLevel>;

  constructor() {
    this.hierarchy = new Map();
    this.initializeHierarchy();
  }

  /**
   * Initialize default hierarchy
   */
  private initializeHierarchy(): void {
    // tenant > group > conversation > message
    this.register({ resource: 'tenant', children: ['group', 'conversation', 'user'] });
    this.register({ resource: 'group', parent: 'tenant', children: ['conversation'] });
    this.register({ resource: 'conversation', parent: 'group', children: ['message'] });
    this.register({ resource: 'message', parent: 'conversation' });
    this.register({ resource: 'user', parent: 'tenant' });
    this.register({ resource: 'file', parent: 'tenant' });
  }

  /**
   * Register hierarchy level
   */
  register(level: PermissionHierarchyLevel): void {
    this.hierarchy.set(level.resource, level);
  }

  /**
   * Get parent resource type
   */
  getParent(resource: string): string | undefined {
    return this.hierarchy.get(resource)?.parent;
  }

  /**
   * Get child resource types
   */
  getChildren(resource: string): string[] {
    return this.hierarchy.get(resource)?.children || [];
  }

  /**
   * Check if resource A is ancestor of resource B
   */
  isAncestor(ancestor: string, descendant: string): boolean {
    let current = descendant;
    
    while (current) {
      if (current === ancestor) return true;
      const parent = this.getParent(current);
      if (!parent) break;
      current = parent;
    }

    return false;
  }

  /**
   * Get all ancestors
   */
  getAncestors(resource: string): string[] {
    const ancestors: string[] = [];
    let current = resource;

    while (current) {
      const parent = this.getParent(current);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }
}

export const permissionHierarchy = new PermissionHierarchy();
