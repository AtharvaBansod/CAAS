/**
 * RT-KAF-002: Schema Registry — Canonical JSON Schema definitions
 * for all realtime event families. Used for producer/consumer
 * validation, schema-registry integration, and compatibility checks.
 */

// ── Base envelope schema ──

export const REALTIME_ENVELOPE_SCHEMA = {
  $id: 'https://caas.io/schemas/realtime-envelope.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'RealtimeEnvelope',
  type: 'object',
  required: [
    'event_id',
    'event_type',
    'schema_version',
    'tenant_id',
    'correlation_id',
    'occurred_at',
    'producer_id',
    'partition_key',
    'payload',
  ],
  properties: {
    event_id: { type: 'string', format: 'uuid' },
    event_type: { type: 'string', pattern: '^[a-z_]+\\.[a-z_]+$' },
    schema_version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    tenant_id: { type: 'string' },
    project_id: { type: 'string' },
    correlation_id: { type: 'string' },
    occurred_at: { type: 'string', format: 'date-time' },
    producer_id: { type: 'string' },
    partition_key: { type: 'string' },
    payload: { type: 'object' },
    metadata: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        conversation_id: { type: 'string' },
        dedupe_key: { type: 'string' },
      },
    },
  },
} as const;

// ── message.created payload ──

export const MESSAGE_CREATED_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/message-created-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'MessageCreatedPayload',
  type: 'object',
  required: ['message_id', 'conversation_id', 'sender_id', 'content'],
  properties: {
    message_id: { type: 'string' },
    conversation_id: { type: 'string' },
    sender_id: { type: 'string' },
    content: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'file', 'rich'] },
        text: { type: 'string' },
        url: { type: 'string' },
        mime_type: { type: 'string' },
        caption: { type: 'string' },
      },
    },
    timestamp: { type: 'string', format: 'date-time' },
    reply_to: { type: 'string' },
  },
} as const;

// ── reaction.added / reaction.removed payload ──

export const REACTION_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/reaction-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'ReactionPayload',
  type: 'object',
  required: ['message_id', 'conversation_id', 'user_id', 'emoji'],
  properties: {
    message_id: { type: 'string' },
    conversation_id: { type: 'string' },
    user_id: { type: 'string' },
    emoji: { type: 'string', maxLength: 8 },
  },
} as const;

// ── thread.reply payload ──

export const THREAD_REPLY_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/thread-reply-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'ThreadReplyPayload',
  type: 'object',
  required: ['parent_message_id', 'reply_message_id', 'conversation_id', 'sender_id', 'content'],
  properties: {
    parent_message_id: { type: 'string' },
    reply_message_id: { type: 'string' },
    conversation_id: { type: 'string' },
    sender_id: { type: 'string' },
    content: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string' },
        text: { type: 'string' },
      },
    },
  },
} as const;

// ── group.* payloads ──

export const GROUP_EVENT_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/group-event-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'GroupEventPayload',
  type: 'object',
  required: ['conversation_id', 'actor_id'],
  properties: {
    conversation_id: { type: 'string' },
    actor_id: { type: 'string' },
    group_name: { type: 'string', maxLength: 128 },
    participant_ids: { type: 'array', items: { type: 'string' }, maxItems: 256 },
    target_user_id: { type: 'string' },
    new_role: { type: 'string', enum: ['admin', 'moderator', 'member'] },
    new_name: { type: 'string' },
    avatar_url: { type: 'string', format: 'uri' },
  },
} as const;

// ── planner.* payloads ──

export const PLANNER_TASK_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/planner-task-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PlannerTaskPayload',
  type: 'object',
  required: ['conversation_id', 'task_id', 'title', 'creator_id'],
  properties: {
    conversation_id: { type: 'string' },
    task_id: { type: 'string' },
    title: { type: 'string', maxLength: 256 },
    description: { type: 'string', maxLength: 2048 },
    creator_id: { type: 'string' },
    assignee_ids: { type: 'array', items: { type: 'string' } },
    due_date: { type: 'string', format: 'date-time' },
    priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    status: { type: 'string', enum: ['open', 'in_progress', 'completed', 'cancelled'] },
  },
} as const;

// ── social.* payloads ──

export const SOCIAL_POST_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/social-post-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SocialPostPayload',
  type: 'object',
  required: ['post_id', 'user_id'],
  properties: {
    post_id: { type: 'string' },
    user_id: { type: 'string' },
    content_type: { type: 'string', enum: ['text', 'image', 'video', 'story'] },
    text: { type: 'string', maxLength: 4096 },
    media_urls: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 10 },
    target_user_id: { type: 'string' },
    visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
    expires_at: { type: 'string', format: 'date-time' },
  },
} as const;

// ── presence.* payloads ──

export const PRESENCE_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/presence-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'PresencePayload',
  type: 'object',
  required: ['user_id'],
  properties: {
    user_id: { type: 'string' },
    status: { type: 'string', enum: ['online', 'away', 'dnd', 'invisible', 'offline'] },
    custom_message: { type: 'string', maxLength: 256 },
    last_seen: { type: 'string', format: 'date-time' },
    target_user_ids: { type: 'array', items: { type: 'string' } },
  },
} as const;

// ── moderation.* payloads (block, report, privacy) ──

export const MODERATION_PAYLOAD_SCHEMA = {
  $id: 'https://caas.io/schemas/moderation-payload.json',
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'ModerationPayload',
  type: 'object',
  required: ['actor_id'],
  properties: {
    actor_id: { type: 'string' },
    target_user_id: { type: 'string' },
    reason: { type: 'string', maxLength: 1024 },
    report_type: { type: 'string', enum: ['spam', 'harassment', 'violence', 'hate_speech', 'other'] },
    evidence: { type: 'object' },
    block_scope: { type: 'string', enum: ['conversation', 'project', 'platform'] },
  },
} as const;

// ── Schema registry map ──

export interface SchemaRegistryEntry {
  schemaId: string;
  version: string;
  compatibility: 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE';
  schema: Record<string, unknown>;
  eventTypes: string[];
}

export const SCHEMA_REGISTRY: SchemaRegistryEntry[] = [
  {
    schemaId: 'realtime-envelope',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: REALTIME_ENVELOPE_SCHEMA,
    eventTypes: ['*'],
  },
  {
    schemaId: 'message-created-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: MESSAGE_CREATED_PAYLOAD_SCHEMA,
    eventTypes: ['message.created'],
  },
  {
    schemaId: 'reaction-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: REACTION_PAYLOAD_SCHEMA,
    eventTypes: ['reaction.added', 'reaction.removed'],
  },
  {
    schemaId: 'thread-reply-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: THREAD_REPLY_PAYLOAD_SCHEMA,
    eventTypes: ['thread.reply'],
  },
  {
    schemaId: 'group-event-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: GROUP_EVENT_PAYLOAD_SCHEMA,
    eventTypes: ['group.created', 'group.member_added', 'group.member_removed', 'group.role_changed', 'group.updated'],
  },
  {
    schemaId: 'planner-task-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: PLANNER_TASK_PAYLOAD_SCHEMA,
    eventTypes: ['planner.task_created', 'planner.task_updated', 'planner.task_completed'],
  },
  {
    schemaId: 'social-post-payload',
    version: '1.0.0',
    compatibility: 'FULL',
    schema: SOCIAL_POST_PAYLOAD_SCHEMA,
    eventTypes: ['social.post_created', 'social.post_liked', 'social.story_viewed'],
  },
  {
    schemaId: 'presence-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: PRESENCE_PAYLOAD_SCHEMA,
    eventTypes: ['presence.updated', 'presence.status_changed'],
  },
  {
    schemaId: 'moderation-payload',
    version: '1.0.0',
    compatibility: 'BACKWARD',
    schema: MODERATION_PAYLOAD_SCHEMA,
    eventTypes: ['block.created', 'block.removed', 'report.submitted', 'privacy.updated'],
  },
];

// ── Runtime validation ──

function validateRequired(obj: Record<string, unknown>, fields: string[]): string[] {
  return fields.filter((f) => obj[f] === undefined || obj[f] === null);
}

function validateType(value: unknown, expected: string): boolean {
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expected === 'array') return Array.isArray(value);
  return typeof value === expected;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  schemaId?: string;
}

export function validatePayload(eventType: string, payload: unknown): ValidationResult {
  const entry = SCHEMA_REGISTRY.find((e) => e.eventTypes.includes(eventType));
  if (!entry) {
    return { valid: true, errors: [], schemaId: undefined }; // No schema = no validation
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be a non-null object'], schemaId: entry.schemaId };
  }

  const schema = entry.schema as Record<string, unknown>;
  const required = (schema['required'] || []) as string[];
  const missing = validateRequired(payload as Record<string, unknown>, required);

  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map((f) => `Missing required field: ${f}`),
      schemaId: entry.schemaId,
    };
  }

  const properties = (schema['properties'] || {}) as Record<string, Record<string, unknown>>;
  const errors: string[] = [];
  const obj = payload as Record<string, unknown>;

  for (const [key, propSchema] of Object.entries(properties)) {
    if (obj[key] === undefined) continue;
    const expectedType = propSchema['type'] as string;
    if (expectedType && !validateType(obj[key], expectedType)) {
      errors.push(`Field '${key}' expected type '${expectedType}', got '${typeof obj[key]}'`);
    }
    if (expectedType === 'string' && typeof obj[key] === 'string') {
      const maxLen = propSchema['maxLength'] as number | undefined;
      if (maxLen && (obj[key] as string).length > maxLen) {
        errors.push(`Field '${key}' exceeds maxLength ${maxLen}`);
      }
      const enumValues = propSchema['enum'] as string[] | undefined;
      if (enumValues && !enumValues.includes(obj[key] as string)) {
        errors.push(`Field '${key}' must be one of: ${enumValues.join(', ')}`);
      }
    }
    if (expectedType === 'array' && Array.isArray(obj[key])) {
      const maxItems = propSchema['maxItems'] as number | undefined;
      if (maxItems && (obj[key] as unknown[]).length > maxItems) {
        errors.push(`Field '${key}' exceeds maxItems ${maxItems}`);
      }
    }
  }

  return { valid: errors.length === 0, errors, schemaId: entry.schemaId };
}

export function validateEnvelope(envelope: unknown): ValidationResult {
  if (!envelope || typeof envelope !== 'object') {
    return { valid: false, errors: ['Envelope must be a non-null object'], schemaId: 'realtime-envelope' };
  }

  const obj = envelope as Record<string, unknown>;
  const required = REALTIME_ENVELOPE_SCHEMA.required as readonly string[];
  const missing = validateRequired(obj, [...required]);

  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map((f) => `Missing required envelope field: ${f}`),
      schemaId: 'realtime-envelope',
    };
  }

  const errors: string[] = [];
  if (typeof obj['event_type'] === 'string' && !/^[a-z_]+\.[a-z_]+$/.test(obj['event_type'] as string)) {
    errors.push('event_type must match pattern ^[a-z_]+\\.[a-z_]+$');
  }
  if (typeof obj['schema_version'] === 'string' && !/^\d+\.\d+\.\d+$/.test(obj['schema_version'] as string)) {
    errors.push('schema_version must match semver pattern');
  }

  return { valid: errors.length === 0, errors, schemaId: 'realtime-envelope' };
}

/**
 * Deserialize with fallback: used by consumers to handle schema
 * version mismatches gracefully. If deserialization fails against
 * the strict schema, falls back to raw JSON.
 */
export function deserializeWithFallback<T = Record<string, unknown>>(
  raw: string,
  eventType?: string
): { data: T; validated: boolean; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: {} as T, validated: false, errors: ['Invalid JSON'] };
  }

  if (!eventType) {
    return { data: parsed as T, validated: false, errors: [] };
  }

  const envelopeResult = validateEnvelope(parsed);
  if (!envelopeResult.valid) {
    return { data: parsed as T, validated: false, errors: envelopeResult.errors };
  }

  const envelope = parsed as Record<string, unknown>;
  const payloadResult = validatePayload(eventType, envelope['payload']);
  if (!payloadResult.valid) {
    return { data: parsed as T, validated: false, errors: payloadResult.errors };
  }

  return { data: parsed as T, validated: true, errors: [] };
}
