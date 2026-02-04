// Topic naming patterns
export const TOPIC_PATTERNS = {
  // Platform topics (single instance)
  PLATFORM_EVENTS: 'platform.events',
  PLATFORM_AUDIT: 'platform.audit',
  PLATFORM_NOTIFICATIONS: 'platform.notifications',

  // Tenant topics (created per tenant)
  CHAT_MESSAGES: 'chat.messages.{tenant_id}',
  CHAT_EVENTS: 'chat.events.{tenant_id}',
  PRESENCE: 'presence.{tenant_id}',
  ANALYTICS: 'analytics.{tenant_id}',
  NOTIFICATIONS: 'notifications.{tenant_id}',

  // Internal topics
  INTERNAL_DLQ: 'internal.dlq',
  INTERNAL_RETRY: 'internal.retry',
} as const;

// Consumer group patterns
export const CONSUMER_GROUPS = {
  MESSAGE_PROCESSOR: 'message-processor',
  EVENT_PROCESSOR: 'event-processor',
  ANALYTICS_PROCESSOR: 'analytics-processor',
  NOTIFICATION_PROCESSOR: 'notification-processor',
  PRESENCE_PROCESSOR: 'presence-processor',
  DLQ_PROCESSOR: 'dlq-processor',
  RETRY_PROCESSOR: 'retry-processor',
} as const;

// Event types
export const EVENT_TYPES = {
  // Chat Events
  MESSAGE_SENT: 'message.sent',
  MESSAGE_EDITED: 'message.edited',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_READ: 'message.read',
  MESSAGE_DELIVERED: 'message.delivered',
  REACTION_ADDED: 'reaction.added',
  REACTION_REMOVED: 'reaction.removed',
  TYPING_STARTED: 'typing.started',
  TYPING_STOPPED: 'typing.stopped',

  // Conversation Events
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  CONVERSATION_DELETED: 'conversation.deleted',
  PARTICIPANT_ADDED: 'participant.added',
  PARTICIPANT_REMOVED: 'participant.removed',
  PARTICIPANT_ROLE_CHANGED: 'participant.role_changed',

  // User Events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline',
  USER_STATUS_CHANGED: 'user.status_changed',
  DEVICE_REGISTERED: 'device.registered',
  DEVICE_REMOVED: 'device.removed',

  // File Events
  FILE_UPLOADED: 'file.uploaded',
  FILE_DELETED: 'file.deleted',
  FILE_SHARED: 'file.shared',
  FILE_PROCESSING_STARTED: 'file.processing_started',
  FILE_PROCESSING_COMPLETED: 'file.processing_completed',
  FILE_PROCESSING_FAILED: 'file.processing_failed',

  // Group Events
  GROUP_CREATED: 'group.created',
  GROUP_UPDATED: 'group.updated',
  GROUP_DELETED: 'group.deleted',
  MEMBER_JOINED: 'member.joined',
  MEMBER_LEFT: 'member.left',
  MEMBER_ROLE_CHANGED: 'member.role_changed',

  // Notification Events
  NOTIFICATION_QUEUED: 'notification.queued',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',

  // Analytics Events
  USER_ACTIVITY: 'analytics.user_activity',
  FEATURE_USAGE: 'analytics.feature_usage',
  ERROR_OCCURRED: 'analytics.error_occurred',

  // Platform Events
  TENANT_CREATED: 'platform.tenant_created',
  TENANT_UPDATED: 'platform.tenant_updated',
  TENANT_DELETED: 'platform.tenant_deleted',
  APPLICATION_CREATED: 'platform.application_created',
  APPLICATION_UPDATED: 'platform.application_updated',
  APPLICATION_DELETED: 'platform.application_deleted',
} as const;

// Schema subjects
export const SCHEMA_SUBJECTS = {
  MESSAGE_ENVELOPE_VALUE: 'message-envelope-value',
  CHAT_MESSAGE_VALUE: 'chat-message-value',
  CHAT_EVENT_VALUE: 'chat-event-value',
  PRESENCE_UPDATE_VALUE: 'presence-update-value',
  NOTIFICATION_VALUE: 'notification-value',
  ANALYTICS_EVENT_VALUE: 'analytics-event-value',
  AUDIT_LOG_VALUE: 'audit-log-value',
} as const;

// Partition strategies
export const PARTITION_STRATEGIES = {
  CONVERSATION_ID: 'conversation_id',
  USER_ID: 'user_id',
  TENANT_ID: 'tenant_id',
  RANDOM: 'random',
} as const;

// Retry topic suffixes
export const RETRY_SUFFIXES = {
  RETRY_1: '.retry.1',  // 1 min delay
  RETRY_2: '.retry.2',  // 5 min delay
  RETRY_3: '.retry.3',  // 30 min delay
  DLQ: '.dlq',          // dead letter queue
} as const;

// Message headers
export const MESSAGE_HEADERS = {
  TENANT_ID: 'tenant_id',
  USER_ID: 'user_id',
  TRACE_ID: 'trace_id',
  CORRELATION_ID: 'correlation_id',
  RETRY_COUNT: 'retry_count',
  ORIGINAL_TOPIC: 'original_topic',
  ERROR_MESSAGE: 'error_message',
  TIMESTAMP: 'timestamp',
} as const;

// Topic configurations
export const TOPIC_CONFIGS = {
  CHAT_MESSAGES: {
    partitions: 16,
    retentionDays: 30,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.CONVERSATION_ID,
  },
  CHAT_EVENTS: {
    partitions: 8,
    retentionDays: 7,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.USER_ID,
  },
  PRESENCE: {
    partitions: 4,
    retentionDays: 1,
    compaction: true,
    partitionStrategy: PARTITION_STRATEGIES.USER_ID,
  },
  ANALYTICS: {
    partitions: 8,
    retentionDays: 90,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.RANDOM,
  },
  NOTIFICATIONS: {
    partitions: 4,
    retentionDays: 7,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.USER_ID,
  },
  PLATFORM_AUDIT: {
    partitions: 8,
    retentionDays: 365,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.TENANT_ID,
  },
  INTERNAL_DLQ: {
    partitions: 4,
    retentionDays: 30,
    compaction: false,
    partitionStrategy: PARTITION_STRATEGIES.RANDOM,
  },
} as const;