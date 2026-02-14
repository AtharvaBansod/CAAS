/**
 * Permission Matrix
 * 
 * Defines role-based permissions for all resources and actions
 */

export type Permission = {
  resource: string;
  action: string;
  roles: string[];
  requiresOwnership?: boolean;
  requiresMembership?: boolean;
};

/**
 * Permission matrix defining what roles can perform what actions
 */
export const PERMISSION_MATRIX: Permission[] = [
  // Conversation permissions
  {
    resource: 'conversation',
    action: 'create',
    roles: ['platform_admin', 'tenant_admin', 'user'],
  },
  {
    resource: 'conversation',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true,
  },
  {
    resource: 'conversation',
    action: 'update',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true,
  },
  {
    resource: 'conversation',
    action: 'delete',
    roles: ['platform_admin', 'tenant_admin'],
    requiresOwnership: true,
  },
  {
    resource: 'conversation',
    action: 'add_member',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true,
  },
  {
    resource: 'conversation',
    action: 'remove_member',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true,
  },
  {
    resource: 'conversation',
    action: 'list',
    roles: ['platform_admin', 'tenant_admin', 'user'],
  },

  // Message permissions
  {
    resource: 'message',
    action: 'create',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true, // Must be member of conversation
  },
  {
    resource: 'message',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresMembership: true,
  },
  {
    resource: 'message',
    action: 'update',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresOwnership: true,
  },
  {
    resource: 'message',
    action: 'delete',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresOwnership: true,
  },

  // User permissions
  {
    resource: 'user',
    action: 'create',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'user',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin', 'user'],
  },
  {
    resource: 'user',
    action: 'update',
    roles: ['platform_admin', 'tenant_admin', 'user'],
    requiresOwnership: true,
  },
  {
    resource: 'user',
    action: 'delete',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'user',
    action: 'list',
    roles: ['platform_admin', 'tenant_admin'],
  },

  // Application permissions
  {
    resource: 'application',
    action: 'create',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'application',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'application',
    action: 'update',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'application',
    action: 'delete',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'application',
    action: 'list',
    roles: ['platform_admin', 'tenant_admin'],
  },

  // Admin-only permissions
  {
    resource: 'tenant',
    action: '*',
    roles: ['platform_admin'],
  },
  {
    resource: 'audit',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin'],
  },
  {
    resource: 'metrics',
    action: 'read',
    roles: ['platform_admin', 'tenant_admin'],
  },
];

/**
 * Check if a role has permission for an action on a resource
 */
export function hasPermission(
  roles: string[],
  resource: string,
  action: string
): Permission | null {
  const permission = PERMISSION_MATRIX.find(
    (p) =>
      (p.resource === resource || p.resource === '*') &&
      (p.action === action || p.action === '*') &&
      p.roles.some((role) => roles.includes(role))
  );

  return permission || null;
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return PERMISSION_MATRIX.filter((p) => p.roles.includes(role));
}

/**
 * Check if permission requires ownership
 */
export function requiresOwnership(resource: string, action: string): boolean {
  const permission = PERMISSION_MATRIX.find(
    (p) => p.resource === resource && p.action === action
  );
  return permission?.requiresOwnership || false;
}

/**
 * Check if permission requires membership
 */
export function requiresMembership(resource: string, action: string): boolean {
  const permission = PERMISSION_MATRIX.find(
    (p) => p.resource === resource && p.action === action
  );
  return permission?.requiresMembership || false;
}
