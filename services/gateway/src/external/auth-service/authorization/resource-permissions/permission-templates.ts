/**
 * Permission Templates
 * 
 * Predefined permission sets for common scenarios
 */

import { PermissionTemplate } from './types';

export const PERMISSION_TEMPLATES: Record<string, PermissionTemplate> = {
  reader: {
    name: 'Reader',
    description: 'Read-only access',
    permissions: ['read'],
  },
  contributor: {
    name: 'Contributor',
    description: 'Read and write access',
    permissions: ['read', 'create', 'update'],
  },
  admin: {
    name: 'Administrator',
    description: 'Full access',
    permissions: ['read', 'create', 'update', 'delete', 'manage'],
  },
};

export function getTemplate(name: string): PermissionTemplate | null {
  return PERMISSION_TEMPLATES[name] || null;
}
