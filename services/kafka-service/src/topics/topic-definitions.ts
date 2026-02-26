import { TopicDefinition, TopicType } from './types';
import { TOPIC_PATTERNS, TOPIC_CONFIGS, PARTITION_STRATEGIES } from '../config/constants';

export const TOPIC_DEFINITIONS: Record<string, TopicDefinition> = {
  // Platform Topics
  PLATFORM_EVENTS: {
    pattern: TOPIC_PATTERNS.PLATFORM_EVENTS,
    type: TopicType.PLATFORM,
    config: {
      partitions: 8,
      replicationFactor: 3,
      retentionDays: 30,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.TENANT_ID,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Platform-wide events (tenant creation, application management, etc.)',
  },

  PLATFORM_AUDIT: {
    pattern: TOPIC_PATTERNS.PLATFORM_AUDIT,
    type: TopicType.PLATFORM,
    config: {
      partitions: 8,
      replicationFactor: 3,
      retentionDays: 365,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.TENANT_ID,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Security and compliance audit logs',
  },

  PLATFORM_NOTIFICATIONS: {
    pattern: TOPIC_PATTERNS.PLATFORM_NOTIFICATIONS,
    type: TopicType.PLATFORM,
    config: {
      partitions: 4,
      replicationFactor: 3,
      retentionDays: 7,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.RANDOM,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Admin notifications and alerts',
  },

  // Tenant Topics (templates)
  CHAT_MESSAGES: {
    pattern: TOPIC_PATTERNS.CHAT_MESSAGES,
    type: TopicType.TENANT,
    config: {
      partitions: 16,
      replicationFactor: 3,
      retentionDays: 30,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.CONVERSATION_ID,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
        { name: 'segment.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
      ],
    },
    description: 'Chat messages for tenant (partitioned by conversation_id for ordering)',
  },

  CHAT_EVENTS: {
    pattern: TOPIC_PATTERNS.CHAT_EVENTS,
    type: TopicType.TENANT,
    config: {
      partitions: 8,
      replicationFactor: 3,
      retentionDays: 7,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.USER_ID,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Chat events (reactions, typing, read receipts) for tenant',
  },

  PRESENCE: {
    pattern: TOPIC_PATTERNS.PRESENCE,
    type: TopicType.TENANT,
    config: {
      partitions: 4,
      replicationFactor: 3,
      retentionDays: 1,
      compaction: true,
      partitionStrategy: PARTITION_STRATEGIES.USER_ID,
      configEntries: [
        { name: 'cleanup.policy', value: 'compact' },
        { name: 'segment.ms', value: String(60 * 60 * 1000) }, // 1 hour
        { name: 'min.cleanable.dirty.ratio', value: '0.1' },
        { name: 'delete.retention.ms', value: String(24 * 60 * 60 * 1000) }, // 1 day
      ],
    },
    description: 'User presence updates for tenant (compacted for latest state)',
  },

  ANALYTICS: {
    pattern: TOPIC_PATTERNS.ANALYTICS,
    type: TopicType.TENANT,
    config: {
      partitions: 8,
      replicationFactor: 3,
      retentionDays: 90,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.RANDOM,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Analytics events for tenant (random partitioning for load distribution)',
  },

  NOTIFICATIONS: {
    pattern: TOPIC_PATTERNS.NOTIFICATIONS,
    type: TopicType.TENANT,
    config: {
      partitions: 4,
      replicationFactor: 3,
      retentionDays: 7,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.USER_ID,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'User notifications for tenant',
  },

  // Internal Topics
  INTERNAL_DLQ: {
    pattern: TOPIC_PATTERNS.INTERNAL_DLQ,
    type: TopicType.INTERNAL,
    config: {
      partitions: 4,
      replicationFactor: 3,
      retentionDays: 30,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.RANDOM,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Dead letter queue for failed messages',
  },

  INTERNAL_RETRY: {
    pattern: TOPIC_PATTERNS.INTERNAL_RETRY,
    type: TopicType.INTERNAL,
    config: {
      partitions: 4,
      replicationFactor: 3,
      retentionDays: 7,
      compaction: false,
      partitionStrategy: PARTITION_STRATEGIES.RANDOM,
      configEntries: [
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
      ],
    },
    description: 'Retry queue for messages to be reprocessed',
  },
};

// Helper functions
export const getPlatformTopics = (): TopicDefinition[] => {
  return Object.values(TOPIC_DEFINITIONS).filter(def => def.type === TopicType.PLATFORM);
};

export const getTenantTopicTemplates = (): TopicDefinition[] => {
  return Object.values(TOPIC_DEFINITIONS).filter(def => def.type === TopicType.TENANT);
};

export const getInternalTopics = (): TopicDefinition[] => {
  return Object.values(TOPIC_DEFINITIONS).filter(def => def.type === TopicType.INTERNAL);
};

export const getTopicDefinition = (topicName: string): TopicDefinition | null => {
  // Direct match
  const directMatch = Object.values(TOPIC_DEFINITIONS).find(def => def.pattern === topicName);
  if (directMatch) {
    return directMatch;
  }

  // Pattern match for tenant topics
  for (const def of Object.values(TOPIC_DEFINITIONS)) {
    if (def.type === TopicType.TENANT) {
      const pattern = def.pattern.replace('{tenant_id}', '([^.]+)');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(topicName)) {
        return def;
      }
    }
  }

  return null;
};

export const extractTenantId = (topicName: string): string | null => {
  for (const def of Object.values(TOPIC_DEFINITIONS)) {
    if (def.type === TopicType.TENANT) {
      const pattern = def.pattern.replace('{tenant_id}', '([^.]+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = topicName.match(regex);
      if (match) {
        return match[1];
      }
    }
  }
  return null;
};
