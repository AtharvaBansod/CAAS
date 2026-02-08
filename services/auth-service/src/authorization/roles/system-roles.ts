/**
 * System Roles
 * 
 * Predefined system roles that cannot be modified
 */

import { Role } from './types';

/**
 * Platform Admin - Full access to everything
 */
export const PLATFORM_ADMIN_ROLE: Omit<Role, '_id' | 'metadata'> = {
  id: 'platform_admin',
  name: 'Platform Administrator',
  description: 'Full access to all platform resources',
  tenant_id: null,
  is_system: true,
  permissions: ['*'], // All permissions
};

/**
 * Tenant Admin - Full access within tenant
 */
export const TENANT_ADMIN_ROLE: Omit<Role, '_id' | 'metadata'> = {
  id: 'tenant_admin',
  name: 'Tenant Administrator',
  description: 'Full access to tenant resources',
  tenant_id: null, // Set per tenant
  is_system: true,
  permissions: [
    'admin.*',
    'user.*',
    'group.*',
    'conversation.*',
    'message.*',
    'file.*',
  ],
};

/**
 * Tenant Member - Basic member permissions
 */
export const TENANT_MEMBER_ROLE: Omit<Role, '_id' | 'metadata'> = {
  id: 'tenant_member',
  name: 'Member',
  description: 'Standard member permissions',
  tenant_id: null,
  is_system: true,
  permissions: [
    'conversation.create',
    'conversation.read',
    'message.send',
    'message.read',
    'message.react',
    'file.upload',
    'file.download',
    'user.read',
  ],
};

/**
 * Moderator - Moderation permissions
 */
export const MODERATOR_ROLE: Omit<Role, '_id' | 'metadata'> = {
  id: 'moderator',
  name: 'Moderator',
  description: 'Content moderation permissions',
  tenant_id: null,
  is_system: false,
  permissions: [
    ...TENANT_MEMBER_ROLE.permissions,
    'message.delete',
    'message.pin',
    'user.ban',
    'group.kick',
  ],
};

/**
 * Guest - Read-only permissions
 */
export const GUEST_ROLE: Omit<Role, '_id' | 'metadata'> = {
  id: 'guest',
  name: 'Guest',
  description: 'Read-only access',
  tenant_id: null,
  is_system: false,
  permissions: [
    'conversation.read',
    'message.read',
    'user.read',
    'file.download',
  ],
};

/**
 * All system roles
 */
export const SYSTEM_ROLES = [
  PLATFORM_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  TENANT_MEMBER_ROLE,
  MODERATOR_ROLE,
  GUEST_ROLE,
];
