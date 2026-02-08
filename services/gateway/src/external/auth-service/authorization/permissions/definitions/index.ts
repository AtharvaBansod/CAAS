/**
 * Permission Definitions
 * 
 * All platform permissions
 */

import { PermissionDefinition } from '../types';
import { MESSAGE_PERMISSIONS } from './message-permissions';
import { conversationPermissions } from './conversation-permissions';
import { groupPermissions } from './group-permissions';
import { userPermissions } from './user-permissions';
import { adminPermissions } from './admin-permissions';

// Re-export for convenience
export const CONVERSATION_PERMISSIONS = conversationPermissions;
export const GROUP_PERMISSIONS = groupPermissions;
export const USER_PERMISSIONS = userPermissions;
export const ADMIN_PERMISSIONS = adminPermissions;

// File permissions
export const FILE_PERMISSIONS: PermissionDefinition[] = [
  { id: 'file.upload', resource: 'file', action: 'upload', description: 'Upload files', scope: 'tenant' },
  { id: 'file.download', resource: 'file', action: 'download', description: 'Download files', scope: 'resource' },
  { id: 'file.delete', resource: 'file', action: 'delete', description: 'Delete files', scope: 'resource' },
  { id: 'file.share', resource: 'file', action: 'share', description: 'Share files', scope: 'resource' },
];

// All permissions
export const ALL_PERMISSIONS: PermissionDefinition[] = [
  ...MESSAGE_PERMISSIONS,
  ...CONVERSATION_PERMISSIONS,
  ...GROUP_PERMISSIONS,
  ...USER_PERMISSIONS,
  ...FILE_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
];
