export interface TopicConfig {
  topic: string;
  partitions: number;
  replicationFactor: number;
  retentionDays: number;
  compaction: boolean;
  partitionStrategy: string;
  configEntries?: Array<{
    name: string;
    value: string;
  }>;
}

export interface TopicInfo {
  name: string;
  partitions: number;
  replicationFactor: number;
  configs: Record<string, string>;
  created: boolean;
}

export interface TenantTopicSet {
  tenantId: string;
  topics: {
    messages: string;
    events: string;
    presence: string;
    analytics: string;
    notifications: string;
  };
}

export interface PartitionKeyResult {
  key: string;
  partition?: number;
}

export enum TopicType {
  PLATFORM = 'platform',
  TENANT = 'tenant',
  INTERNAL = 'internal',
}

export interface TopicDefinition {
  pattern: string;
  type: TopicType;
  config: Omit<TopicConfig, 'topic'>;
  description: string;
}
