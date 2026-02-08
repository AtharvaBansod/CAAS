/**
 * Default System Policies
 * 
 * Pre-defined policies for common authorization scenarios
 */

import { DefaultPolicy } from './types';

/**
 * Platform admin policies
 */
export const PLATFORM_ADMIN_POLICIES: DefaultPolicy[] = [
  {
    name: 'platform-admin-full-access',
    description: 'Platform administrators have full access to all resources',
    effect: 'allow',
    priority: 1000,
    target: {
      subjects: {
        roles: ['platform_admin'],
      },
      resources: {
        types: ['*'],
      },
      actions: ['*'],
    },
    tags: ['system', 'platform', 'admin'],
  },
];

/**
 * Tenant admin policies
 */
export const TENANT_ADMIN_POLICIES: DefaultPolicy[] = [
  {
    name: 'tenant-admin-full-access',
    description: 'Tenant administrators have full access within their tenant',
    effect: 'allow',
    priority: 900,
    target: {
      subjects: {
        roles: ['tenant_admin'],
      },
      resources: {
        types: ['*'],
      },
      actions: ['*'],
    },
    conditions: [
      {
        type: 'equals',
        attribute: 'subject.tenant_id',
        value: '${resource.tenant_id}',
      },
    ],
    tags: ['system', 'tenant', 'admin'],
  },
];

/**
 * Message policies
 */
export const MESSAGE_POLICIES: DefaultPolicy[] = [
  {
    name: 'message-owner-full-access',
    description: 'Message owners can read, update, and delete their own messages',
    effect: 'allow',
    priority: 800,
    target: {
      resources: {
        types: ['message'],
      },
      actions: ['read', 'update', 'delete'],
    },
    conditions: [
      {
        type: 'equals',
        attribute: 'subject.user_id',
        value: '${resource.owner_id}',
      },
    ],
    tags: ['message', 'owner'],
  },
  {
    name: 'message-conversation-member-read',
    description: 'Conversation members can read messages',
    effect: 'allow',
    priority: 700,
    target: {
      resources: {
        types: ['message'],
      },
      actions: ['read'],
    },
    conditions: [
      {
        type: 'contains',
        attribute: 'resource.conversation.members',
        value: '${subject.user_id}',
      },
    ],
    tags: ['message', 'conversation', 'member'],
  },
  {
    name: 'message-create-in-conversation',
    description: 'Conversation members can create messages',
    effect: 'allow',
    priority: 700,
    target: {
      resources: {
        types: ['conversation'],
      },
      actions: ['message:create'],
    },
    conditions: [
      {
        type: 'contains',
        attribute: 'resource.members',
        value: '${subject.user_id}',
      },
    ],
    tags: ['message', 'conversation', 'create'],
  },
];

/**
 * Conversation policies
 */
export const CONVERSATION_POLICIES: DefaultPolicy[] = [
  {
    name: 'conversation-member-read',
    description: 'Conversation members can read conversation details',
    effect: 'allow',
    priority: 700,
    target: {
      resources: {
        types: ['conversation'],
      },
      actions: ['read'],
    },
    conditions: [
      {
        type: 'contains',
        attribute: 'resource.members',
        value: '${subject.user_id}',
      },
    ],
    tags: ['conversation', 'member', 'read'],
  },
  {
    name: 'conversation-creator-manage',
    description: 'Conversation creators can update and delete conversations',
    effect: 'allow',
    priority: 800,
    target: {
      resources: {
        types: ['conversation'],
      },
      actions: ['update', 'delete'],
    },
    conditions: [
      {
        type: 'equals',
        attribute: 'subject.user_id',
        value: '${resource.created_by}',
      },
    ],
    tags: ['conversation', 'creator', 'manage'],
  },
];

/**
 * Group policies
 */
export const GROUP_POLICIES: DefaultPolicy[] = [
  {
    name: 'group-member-read',
    description: 'Group members can read group details',
    effect: 'allow',
    priority: 700,
    target: {
      resources: {
        types: ['group'],
      },
      actions: ['read'],
    },
    conditions: [
      {
        type: 'contains',
        attribute: 'resource.members',
        value: '${subject.user_id}',
      },
    ],
    tags: ['group', 'member', 'read'],
  },
  {
    name: 'group-admin-manage',
    description: 'Group admins can manage group settings and members',
    effect: 'allow',
    priority: 800,
    target: {
      resources: {
        types: ['group'],
      },
      actions: ['update', 'delete', 'member:add', 'member:remove'],
    },
    conditions: [
      {
        type: 'contains',
        attribute: 'resource.admins',
        value: '${subject.user_id}',
      },
    ],
    tags: ['group', 'admin', 'manage'],
  },
];

/**
 * User policies
 */
export const USER_POLICIES: DefaultPolicy[] = [
  {
    name: 'user-self-read',
    description: 'Users can read their own profile',
    effect: 'allow',
    priority: 800,
    target: {
      resources: {
        types: ['user'],
      },
      actions: ['read'],
    },
    conditions: [
      {
        type: 'equals',
        attribute: 'subject.user_id',
        value: '${resource.user_id}',
      },
    ],
    tags: ['user', 'self', 'read'],
  },
  {
    name: 'user-self-update',
    description: 'Users can update their own profile',
    effect: 'allow',
    priority: 800,
    target: {
      resources: {
        types: ['user'],
      },
      actions: ['update'],
    },
    conditions: [
      {
        type: 'equals',
        attribute: 'subject.user_id',
        value: '${resource.user_id}',
      },
    ],
    tags: ['user', 'self', 'update'],
  },
];

/**
 * Security policies
 */
export const SECURITY_POLICIES: DefaultPolicy[] = [
  {
    name: 'deny-suspended-users',
    description: 'Deny all access to suspended users',
    effect: 'deny',
    priority: 2000, // Highest priority
    target: {
      subjects: {
        attributes: {
          status: 'suspended',
        },
      },
      resources: {
        types: ['*'],
      },
      actions: ['*'],
    },
    tags: ['security', 'suspended'],
  },
  {
    name: 'deny-outside-business-hours',
    description: 'Deny access outside business hours (optional)',
    effect: 'deny',
    priority: 1900,
    target: {
      resources: {
        types: ['*'],
      },
      actions: ['*'],
    },
    conditions: [
      {
        type: 'not',
        condition: {
          type: 'time-between',
          attribute: 'environment.time',
          value: { start: '09:00', end: '17:00' },
        },
      },
    ],
    tags: ['security', 'business-hours'],
  },
];

/**
 * All default policies
 */
export const DEFAULT_POLICIES: DefaultPolicy[] = [
  ...PLATFORM_ADMIN_POLICIES,
  ...TENANT_ADMIN_POLICIES,
  ...MESSAGE_POLICIES,
  ...CONVERSATION_POLICIES,
  ...GROUP_POLICIES,
  ...USER_POLICIES,
  ...SECURITY_POLICIES,
];

/**
 * Get default policies by tag
 */
export function getDefaultPoliciesByTag(tag: string): DefaultPolicy[] {
  return DEFAULT_POLICIES.filter((policy) => policy.tags.includes(tag));
}

/**
 * Get default policies by resource type
 */
export function getDefaultPoliciesByResourceType(resourceType: string): DefaultPolicy[] {
  return DEFAULT_POLICIES.filter((policy) =>
    policy.target.resources?.types?.includes(resourceType) ||
    policy.target.resources?.types?.includes('*')
  );
}
