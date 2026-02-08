/**
 * Admin Permissions
 * Define all administrative permissions
 */

import { PermissionDefinition } from '../types';

export const adminPermissions: PermissionDefinition[] = [
  {
    id: 'admin.tenant.manage',
    resource: 'admin',
    action: 'tenant.manage',
    description: 'Manage tenant settings and configuration',
    scope: 'tenant',
  },
  {
    id: 'admin.users.manage',
    resource: 'admin',
    action: 'users.manage',
    description: 'Full user management capabilities',
    scope: 'tenant',
    implies: ['user.create', 'user.read', 'user.update', 'user.delete', 'user.ban', 'user.unban', 'user.manage_roles'],
  },
  {
    id: 'admin.settings.manage',
    resource: 'admin',
    action: 'settings.manage',
    description: 'Manage application settings',
    scope: 'tenant',
  },
  {
    id: 'admin.policies.manage',
    resource: 'admin',
    action: 'policies.manage',
    description: 'Manage authorization policies',
    scope: 'tenant',
  },
  {
    id: 'admin.roles.manage',
    resource: 'admin',
    action: 'roles.manage',
    description: 'Manage roles and permissions',
    scope: 'tenant',
  },
  {
    id: 'admin.audit.view',
    resource: 'admin',
    action: 'audit.view',
    description: 'View audit logs',
    scope: 'tenant',
  },
  {
    id: 'admin.audit.export',
    resource: 'admin',
    action: 'audit.export',
    description: 'Export audit logs',
    scope: 'tenant',
    requires: ['admin.audit.view'],
  },
  {
    id: 'admin.analytics.view',
    resource: 'admin',
    action: 'analytics.view',
    description: 'View analytics and reports',
    scope: 'tenant',
  },
  {
    id: 'admin.billing.manage',
    resource: 'admin',
    action: 'billing.manage',
    description: 'Manage billing and subscriptions',
    scope: 'tenant',
  },
  {
    id: 'admin.integrations.manage',
    resource: 'admin',
    action: 'integrations.manage',
    description: 'Manage third-party integrations',
    scope: 'tenant',
  },
];
