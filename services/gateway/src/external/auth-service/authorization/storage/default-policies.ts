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
      subjects: [
        { type: 'role', operator: 'in', value: ['platform_admin'] }
      ],
      resources: [
        { type: 'type', operator: 'equals', value: '*' }
      ],
      actions: [
        { operator: 'equals', value: '*' }
      ],
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
      subjects: [
        { type: 'role', operator: 'in', value: ['tenant_admin'] }
      ],
      resources: [
        { type: 'type', operator: 'equals', value: '*' }
      ],
      actions: [
        { operator: 'equals', value: '*' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'equals',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'message' }
      ],
      actions: [
        { operator: 'in', value: ['read', 'update', 'delete'] }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'equals',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'message' }
      ],
      actions: [
        { operator: 'equals', value: 'read' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'contains',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'conversation' }
      ],
      actions: [
        { operator: 'equals', value: 'message:create' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'contains',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'conversation' }
      ],
      actions: [
        { operator: 'equals', value: 'read' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'contains',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'conversation' }
      ],
      actions: [
        { operator: 'in', value: ['update', 'delete'] }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'equals',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'group' }
      ],
      actions: [
        { operator: 'equals', value: 'read' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'contains',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'group' }
      ],
      actions: [
        { operator: 'in', value: ['update', 'delete', 'member:add', 'member:remove'] }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'contains',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'user' }
      ],
      actions: [
        { operator: 'equals', value: 'read' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'equals',
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
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: 'user' }
      ],
      actions: [
        { operator: 'equals', value: 'update' }
      ],
    },
    conditions: [
      {
        type: 'simple',
        operator: 'equals',
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
      subjects: [
        { type: 'attribute', operator: 'equals', attribute: 'status', value: 'suspended' }
      ],
      resources: [
        { type: 'type', operator: 'equals', value: '*' }
      ],
      actions: [
        { operator: 'equals', value: '*' }
      ],
    },
    tags: ['security', 'suspended'],
  },
  {
    name: 'deny-outside-business-hours',
    description: 'Deny access outside business hours (optional)',
    effect: 'deny',
    priority: 1900,
    target: {
      subjects: [],
      resources: [
        { type: 'type', operator: 'equals', value: '*' }
      ],
      actions: [
        { operator: 'equals', value: '*' }
      ],
    },
    conditions: [
      {
        type: 'compound',
        operator: 'not',
        conditions: [
          {
            type: 'simple',
            operator: 'matches',
            attribute: 'environment.time',
            value: '.*'
          }
        ]
      }
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
    policy.target.resources.some(r => {
      if (r.type !== 'type') return false;
      const val = r.value;
      if (val === '*') return true;
      if (val === resourceType) return true;
      if (Array.isArray(val) && (val.includes('*') || val.includes(resourceType))) return true;
      return false;
    })
  );
}
