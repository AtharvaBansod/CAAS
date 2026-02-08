/**
 * Group Permissions
 * Define all permissions related to groups
 */

import { PermissionDefinition } from '../types';

export const groupPermissions: PermissionDefinition[] = [
  {
    id: 'group.create',
    resource: 'group',
    action: 'create',
    description: 'Create new groups',
    scope: 'tenant',
  },
  {
    id: 'group.read',
    resource: 'group',
    action: 'read',
    description: 'View group details',
    scope: 'resource',
  },
  {
    id: 'group.update',
    resource: 'group',
    action: 'update',
    description: 'Update group settings',
    scope: 'resource',
    requires: ['group.read'],
  },
  {
    id: 'group.delete',
    resource: 'group',
    action: 'delete',
    description: 'Delete groups',
    scope: 'resource',
    requires: ['group.read'],
  },
  {
    id: 'group.join',
    resource: 'group',
    action: 'join',
    description: 'Join a group',
    scope: 'resource',
  },
  {
    id: 'group.leave',
    resource: 'group',
    action: 'leave',
    description: 'Leave a group',
    scope: 'resource',
  },
  {
    id: 'group.invite',
    resource: 'group',
    action: 'invite',
    description: 'Invite users to group',
    scope: 'resource',
    requires: ['group.read'],
  },
  {
    id: 'group.kick',
    resource: 'group',
    action: 'kick',
    description: 'Remove members from group',
    scope: 'resource',
    requires: ['group.read'],
  },
  {
    id: 'group.ban',
    resource: 'group',
    action: 'ban',
    description: 'Ban users from group',
    scope: 'resource',
    requires: ['group.read', 'group.kick'],
  },
  {
    id: 'group.unban',
    resource: 'group',
    action: 'unban',
    description: 'Unban users from group',
    scope: 'resource',
    requires: ['group.read'],
  },
  {
    id: 'group.manage_roles',
    resource: 'group',
    action: 'manage_roles',
    description: 'Manage group member roles',
    scope: 'resource',
    requires: ['group.read'],
  },
];
