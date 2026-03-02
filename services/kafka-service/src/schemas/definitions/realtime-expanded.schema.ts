import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

/**
 * RT-KAF-002: JSON Schema for reaction events (message_react)
 */
export const REACTION_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'reaction-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Reaction Event',
    description: 'Reaction event payload for message reactions',
    type: 'object',
    properties: {
      reaction_id: { type: 'string', description: 'Unique reaction identifier', minLength: 1, maxLength: 100 },
      message_id: { type: 'string', description: 'Target message identifier', minLength: 1, maxLength: 100 },
      conversation_id: { type: 'string', description: 'Conversation identifier', minLength: 1, maxLength: 100 },
      user_id: { type: 'string', description: 'User who reacted', minLength: 1, maxLength: 50 },
      reaction: { type: 'string', description: 'Reaction emoji or code', minLength: 1, maxLength: 64 },
      action: { type: 'string', description: 'Add or remove', enum: ['add', 'remove'] },
      tenant_id: { type: 'string', description: 'Tenant identifier', minLength: 1, maxLength: 50 },
      project_id: { type: ['string', 'null'], description: 'Project identifier', maxLength: 50 },
      timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp' },
    },
    required: ['reaction_id', 'message_id', 'conversation_id', 'user_id', 'reaction', 'action', 'tenant_id', 'timestamp'],
    additionalProperties: false,
  }),
  version: 1,
  compatibility: 'BACKWARD',
};

/**
 * RT-KAF-002: JSON Schema for thread reply events
 */
export const THREAD_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'thread-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Thread Event',
    description: 'Thread reply event payload',
    type: 'object',
    properties: {
      reply_id: { type: 'string', description: 'Unique reply identifier', minLength: 1, maxLength: 100 },
      parent_message_id: { type: 'string', description: 'Parent message identifier', minLength: 1, maxLength: 100 },
      conversation_id: { type: 'string', description: 'Conversation identifier', minLength: 1, maxLength: 100 },
      sender_id: { type: 'string', description: 'Reply sender user ID', minLength: 1, maxLength: 50 },
      content: { type: 'string', description: 'Reply content text', maxLength: 10000 },
      tenant_id: { type: 'string', description: 'Tenant identifier', minLength: 1, maxLength: 50 },
      project_id: { type: ['string', 'null'], description: 'Project identifier', maxLength: 50 },
      timestamp: { type: 'string', format: 'date-time', description: 'ISO timestamp' },
    },
    required: ['reply_id', 'parent_message_id', 'conversation_id', 'sender_id', 'content', 'tenant_id', 'timestamp'],
    additionalProperties: false,
  }),
  version: 1,
  compatibility: 'BACKWARD',
};

/**
 * RT-KAF-002: JSON Schema for group lifecycle events
 */
export const GROUP_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'group-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Group Event',
    description: 'Group lifecycle event payload (create, settings, roles, invites)',
    type: 'object',
    properties: {
      event_sub_type: { type: 'string', enum: ['group_create', 'group_settings_update', 'group_member_role_update', 'group_invite_link'] },
      group_id: { type: 'string', description: 'Group conversation identifier', maxLength: 100 },
      conversation_id: { type: 'string', description: 'Alias for group_id', maxLength: 100 },
      name: { type: ['string', 'null'], description: 'Group name', maxLength: 200 },
      actor_id: { type: 'string', description: 'User who performed the action', maxLength: 50 },
      target_user_id: { type: ['string', 'null'], description: 'Affected user (for role updates)', maxLength: 50 },
      role: { type: ['string', 'null'], description: 'New role for target user', maxLength: 30 },
      settings: { type: ['object', 'null'], description: 'Arbitrary settings object' },
      invite_token: { type: ['string', 'null'], description: 'Generated invite token', maxLength: 200 },
      tenant_id: { type: 'string', minLength: 1, maxLength: 50 },
      project_id: { type: ['string', 'null'], maxLength: 50 },
      timestamp: { type: 'string', format: 'date-time' },
    },
    required: ['event_sub_type', 'actor_id', 'tenant_id', 'timestamp'],
    additionalProperties: true,
  }),
  version: 1,
  compatibility: 'BACKWARD',
};

/**
 * RT-KAF-002: JSON Schema for planner / task events
 */
export const PLANNER_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'planner-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Planner Event',
    description: 'Task planner event payload (create, update)',
    type: 'object',
    properties: {
      task_id: { type: 'string', minLength: 1, maxLength: 100 },
      conversation_id: { type: 'string', minLength: 1, maxLength: 100 },
      title: { type: 'string', maxLength: 500 },
      description: { type: ['string', 'null'], maxLength: 5000 },
      status: { type: 'string', enum: ['open', 'in_progress', 'done', 'cancelled'] },
      assignee_id: { type: ['string', 'null'], maxLength: 50 },
      created_by: { type: 'string', maxLength: 50 },
      updated_by: { type: ['string', 'null'], maxLength: 50 },
      tenant_id: { type: 'string', minLength: 1, maxLength: 50 },
      project_id: { type: ['string', 'null'], maxLength: 50 },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: ['string', 'null'], format: 'date-time' },
    },
    required: ['task_id', 'conversation_id', 'title', 'status', 'created_by', 'tenant_id', 'created_at'],
    additionalProperties: false,
  }),
  version: 1,
  compatibility: 'BACKWARD',
};

/**
 * RT-KAF-002: JSON Schema for social interaction events (post/story)
 */
export const SOCIAL_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'social-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Social Event',
    description: 'Social interaction event payload (likes, comments, shares, story views/reactions)',
    type: 'object',
    properties: {
      event_sub_type: { type: 'string', enum: ['post_like', 'post_comment', 'post_save', 'post_share', 'story_view', 'story_react', 'media_viewer_sync'] },
      resource_id: { type: 'string', description: 'Post or story identifier', minLength: 1, maxLength: 100 },
      user_id: { type: 'string', minLength: 1, maxLength: 50 },
      content: { type: ['string', 'null'], description: 'Comment text or reaction emoji', maxLength: 5000 },
      action: { type: ['string', 'null'], description: 'Action qualifier (like/unlike etc)', maxLength: 20 },
      parent_comment_id: { type: ['string', 'null'], maxLength: 100 },
      target_conversation_id: { type: ['string', 'null'], maxLength: 100 },
      position_ms: { type: ['integer', 'null'], description: 'Media playback position' },
      state: { type: ['string', 'null'], enum: ['playing', 'paused', 'seeking', null] },
      tenant_id: { type: 'string', minLength: 1, maxLength: 50 },
      project_id: { type: ['string', 'null'], maxLength: 50 },
      timestamp: { type: 'string', format: 'date-time' },
    },
    required: ['event_sub_type', 'resource_id', 'user_id', 'tenant_id', 'timestamp'],
    additionalProperties: true,
  }),
  version: 1,
  compatibility: 'BACKWARD',
};
