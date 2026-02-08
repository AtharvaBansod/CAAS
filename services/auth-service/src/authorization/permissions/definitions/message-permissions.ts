/**
 * Message Permissions
 */

import { PermissionDefinition } from '../types';

export const MESSAGE_PERMISSIONS: PermissionDefinition[] = [
  {
    id: 'message.send',
    resource: 'message',
    action: 'send',
    description: 'Send messages in conversations',
    scope: 'resource',
  },
  {
    id: 'message.read',
    resource: 'message',
    action: 'read',
    description: 'Read messages',
    scope: 'resource',
  },
  {
    id: 'message.update',
    resource: 'message',
    action: 'update',
    description: 'Edit own messages',
    scope: 'resource',
  },
  {
    id: 'message.delete',
    resource: 'message',
    action: 'delete',
    description: 'Delete messages',
    scope: 'resource',
    implies: ['message.read'],
  },
  {
    id: 'message.react',
    resource: 'message',
    action: 'react',
    description: 'React to messages',
    scope: 'resource',
    requires: ['message.read'],
  },
  {
    id: 'message.pin',
    resource: 'message',
    action: 'pin',
    description: 'Pin messages',
    scope: 'resource',
  },
  {
    id: 'message.forward',
    resource: 'message',
    action: 'forward',
    description: 'Forward messages',
    scope: 'resource',
    requires: ['message.read'],
  },
];
