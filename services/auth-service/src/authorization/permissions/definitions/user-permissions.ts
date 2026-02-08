/**
 * User Permissions
 * Define all permissions related to user management
 */

import { PermissionDefinition } from '../types';

export const userPermissions: PermissionDefinition[] = [
  {
    id: 'user.create',
    resource: 'user',
    action: 'create',
    description: 'Create new users',
    scope: 'tenant',
  },
  {
    id: 'user.read',
    resource: 'user',
    action: 'read',
    description: 'View user profiles',
    scope: 'resource',
  },
  {
    id: 'user.update',
    resource: 'user',
    action: 'update',
    description: 'Update user profiles',
    scope: 'resource',
    requires: ['user.read'],
  },
  {
    id: 'user.delete',
    resource: 'user',
    action: 'delete',
    description: 'Delete users',
    scope: 'resource',
    requires: ['user.read'],
  },
  {
    id: 'user.ban',
    resource: 'user',
    action: 'ban',
    description: 'Ban users from tenant',
    scope: 'tenant',
    requires: ['user.read'],
  },
  {
    id: 'user.unban',
    resource: 'user',
    action: 'unban',
    description: 'Unban users',
    scope: 'tenant',
    requires: ['user.read'],
  },
  {
    id: 'user.impersonate',
    resource: 'user',
    action: 'impersonate',
    description: 'Impersonate another user (admin only)',
    scope: 'tenant',
    requires: ['user.read'],
  },
  {
    id: 'user.manage_roles',
    resource: 'user',
    action: 'manage_roles',
    description: 'Assign or revoke user roles',
    scope: 'tenant',
    requires: ['user.read'],
  },
  {
    id: 'user.view_activity',
    resource: 'user',
    action: 'view_activity',
    description: 'View user activity logs',
    scope: 'resource',
    requires: ['user.read'],
  },
];
