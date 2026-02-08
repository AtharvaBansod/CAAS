/**
 * Permission System Types
 */

/**
 * Permission definition
 */
export interface PermissionDefinition {
  id: string; // e.g., 'message.send'
  resource: string; // e.g., 'message'
  action: string; // e.g., 'send'
  description: string;
  scope: 'global' | 'tenant' | 'resource';
  requires?: string[]; // Prerequisites
  implies?: string[]; // Implied permissions
}

/**
 * Permission hierarchy level
 */
export interface PermissionHierarchyLevel {
  resource: string;
  parent?: string;
  children?: string[];
}
