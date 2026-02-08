/**
 * Conversation Permissions
 * Define all permissions related to conversations
 */

import { PermissionDefinition } from '../types';

export const conversationPermissions: PermissionDefinition[] = [
  {
    id: 'conversation.create',
    resource: 'conversation',
    action: 'create',
    description: 'Create new conversations',
    scope: 'tenant',
  },
  {
    id: 'conversation.read',
    resource: 'conversation',
    action: 'read',
    description: 'View conversation details and messages',
    scope: 'resource',
  },
  {
    id: 'conversation.update',
    resource: 'conversation',
    action: 'update',
    description: 'Update conversation settings (name, description, etc.)',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.delete',
    resource: 'conversation',
    action: 'delete',
    description: 'Delete conversations',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.add_member',
    resource: 'conversation',
    action: 'add_member',
    description: 'Add members to conversation',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.remove_member',
    resource: 'conversation',
    action: 'remove_member',
    description: 'Remove members from conversation',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.set_admin',
    resource: 'conversation',
    action: 'set_admin',
    description: 'Grant or revoke admin privileges in conversation',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.leave',
    resource: 'conversation',
    action: 'leave',
    description: 'Leave a conversation',
    scope: 'resource',
  },
  {
    id: 'conversation.archive',
    resource: 'conversation',
    action: 'archive',
    description: 'Archive conversations',
    scope: 'resource',
    requires: ['conversation.read'],
  },
  {
    id: 'conversation.mute',
    resource: 'conversation',
    action: 'mute',
    description: 'Mute conversation notifications',
    scope: 'resource',
  },
];
