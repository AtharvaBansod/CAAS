import { getAdminClient } from '../client/admin-client';
import { TopicConfig, TopicInfo, TenantTopicSet } from './types';
import { 
  TOPIC_DEFINITIONS, 
  getPlatformTopics, 
  getTenantTopicTemplates, 
  getInternalTopics,
  getTopicDefinition 
} from './topic-definitions';
import { env } from '../config/environment';

export class TopicManager {
  private adminClient = getAdminClient();

  /**
   * Create a single topic
   */
  public async createTopic(config: TopicConfig): Promise<void> {
    const topicConfig = {
      topic: config.topic,
      numPartitions: config.partitions,
      replicationFactor: config.replicationFactor,
      configEntries: [
        { name: 'retention.ms', value: String(config.retentionDays * 24 * 60 * 60 * 1000) },
        { name: 'cleanup.policy', value: config.compaction ? 'compact' : 'delete' },
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
        ...(config.configEntries || []),
      ],
    };

    await this.adminClient.createTopic(topicConfig);
  }

  /**
   * Create multiple topics
   */
  public async createTopics(configs: TopicConfig[]): Promise<void> {
    const topicConfigs = configs.map(config => ({
      topic: config.topic,
      numPartitions: config.partitions,
      replicationFactor: config.replicationFactor,
      configEntries: [
        { name: 'retention.ms', value: String(config.retentionDays * 24 * 60 * 60 * 1000) },
        { name: 'cleanup.policy', value: config.compaction ? 'compact' : 'delete' },
        { name: 'compression.type', value: 'snappy' },
        { name: 'min.insync.replicas', value: '2' },
        ...(config.configEntries || []),
      ],
    }));

    await this.adminClient.createTopics(topicConfigs);
  }

  /**
   * Delete topics
   */
  public async deleteTopics(topics: string[]): Promise<void> {
    await this.adminClient.deleteTopics(topics);
  }

  /**
   * List all topics
   */
  public async listTopics(): Promise<string[]> {
    return await this.adminClient.listTopics();
  }

  /**
   * Get detailed topic information
   */
  public async getTopicInfo(topicName: string): Promise<TopicInfo> {
    const info = await this.adminClient.getTopicInfo(topicName);
    return {
      ...info,
      created: true,
    };
  }

  /**
   * Update topic configuration
   */
  public async updateTopicConfig(
    topicName: string,
    config: Partial<TopicConfig>
  ): Promise<void> {
    const configEntries: Array<{ name: string; value: string }> = [];

    if (config.retentionDays !== undefined) {
      configEntries.push({
        name: 'retention.ms',
        value: String(config.retentionDays * 24 * 60 * 60 * 1000),
      });
    }

    if (config.compaction !== undefined) {
      configEntries.push({
        name: 'cleanup.policy',
        value: config.compaction ? 'compact' : 'delete',
      });
    }

    if (config.configEntries) {
      configEntries.push(...config.configEntries);
    }

    if (configEntries.length > 0) {
      await this.adminClient.updateTopicConfig(topicName, configEntries);
    }
  }

  /**
   * Create all platform topics
   */
  public async createPlatformTopics(): Promise<void> {
    console.log('🏗️ Creating platform topics...');
    
    const platformTopics = getPlatformTopics();
    const configs: TopicConfig[] = platformTopics.map(def => ({
      topic: def.pattern,
      ...def.config,
    }));

    await this.createTopics(configs);
    console.log(`✅ Created ${configs.length} platform topics`);
  }

  /**
   * Create all internal topics
   */
  public async createInternalTopics(): Promise<void> {
    console.log('🔧 Creating internal topics...');
    
    const internalTopics = getInternalTopics();
    const configs: TopicConfig[] = internalTopics.map(def => ({
      topic: def.pattern,
      ...def.config,
    }));

    // Add retry topics with specific delays
    const retryTopics: TopicConfig[] = [
      {
        topic: 'internal.retry.1min',
        partitions: 4,
        replicationFactor: 3,
        retentionDays: 1,
        compaction: false,
        partitionStrategy: 'random',
        configEntries: [
          { name: 'segment.ms', value: String(60 * 60 * 1000) }, // 1 hour
        ],
      },
      {
        topic: 'internal.retry.5min',
        partitions: 4,
        replicationFactor: 3,
        retentionDays: 1,
        compaction: false,
        partitionStrategy: 'random',
        configEntries: [
          { name: 'segment.ms', value: String(60 * 60 * 1000) }, // 1 hour
        ],
      },
      {
        topic: 'internal.retry.30min',
        partitions: 4,
        replicationFactor: 3,
        retentionDays: 1,
        compaction: false,
        partitionStrategy: 'random',
        configEntries: [
          { name: 'segment.ms', value: String(60 * 60 * 1000) }, // 1 hour
        ],
      },
    ];

    await this.createTopics([...configs, ...retryTopics]);
    console.log(`✅ Created ${configs.length + retryTopics.length} internal topics`);
  }

  /**
   * Create tenant-specific topics
   */
  public async createTenantTopics(tenantId: string): Promise<TenantTopicSet> {
    console.log(`🏗️ Creating tenant topics for: ${tenantId}`);
    
    const tenantTemplates = getTenantTopicTemplates();
    const configs: TopicConfig[] = tenantTemplates.map(def => ({
      topic: def.pattern.replace('{tenant_id}', tenantId),
      ...def.config,
    }));

    await this.createTopics(configs);

    const topicSet: TenantTopicSet = {
      tenantId,
      topics: {
        messages: `chat.messages.${tenantId}`,
        events: `chat.events.${tenantId}`,
        presence: `presence.${tenantId}`,
        analytics: `analytics.${tenantId}`,
        notifications: `notifications.${tenantId}`,
      },
    };

    console.log(`✅ Created ${configs.length} tenant topics for: ${tenantId}`);
    return topicSet;
  }

  /**
   * Delete tenant-specific topics
   */
  public async deleteTenantTopics(tenantId: string): Promise<void> {
    console.log(`🗑️ Deleting tenant topics for: ${tenantId}`);
    
    const tenantTemplates = getTenantTopicTemplates();
    const topics = tenantTemplates.map(def => 
      def.pattern.replace('{tenant_id}', tenantId)
    );

    await this.deleteTopics(topics);
    console.log(`✅ Deleted ${topics.length} tenant topics for: ${tenantId}`);
  }

  /**
   * Initialize all required topics
   */
  public async initializeAllTopics(): Promise<void> {
    console.log('🚀 Initializing all Kafka topics...');
    
    try {
      // Create platform topics
      await this.createPlatformTopics();
      
      // Create internal topics
      await this.createInternalTopics();
      
      console.log('✅ All topics initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize topics:', error);
      throw error;
    }
  }

  /**
   * Get topic health status
   */
  public async getTopicHealth(): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    topics: Array<{
      name: string;
      healthy: boolean;
      partitions: number;
      replicationFactor: number;
      issues?: string[];
    }>;
  }> {
    const topics = await this.listTopics();
    const healthResults = await Promise.allSettled(
      topics.map(async (topicName) => {
        try {
          const info = await this.getTopicInfo(topicName);
          const definition = getTopicDefinition(topicName);
          const issues: string[] = [];

          // Check if topic matches expected configuration
          if (definition) {
            if (info.partitions < definition.config.partitions) {
              issues.push(`Expected ${definition.config.partitions} partitions, got ${info.partitions}`);
            }
            if (info.replicationFactor < definition.config.replicationFactor) {
              issues.push(`Expected replication factor ${definition.config.replicationFactor}, got ${info.replicationFactor}`);
            }
          }

          return {
            name: topicName,
            healthy: issues.length === 0,
            partitions: info.partitions,
            replicationFactor: info.replicationFactor,
            issues: issues.length > 0 ? issues : undefined,
          };
        } catch (error) {
          return {
            name: topicName,
            healthy: false,
            partitions: 0,
            replicationFactor: 0,
            issues: [`Failed to get topic info: ${error instanceof Error ? error.message : 'Unknown error'}`],
          };
        }
      })
    );

    const results = healthResults
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const healthy = results.filter(r => r.healthy).length;
    const unhealthy = results.filter(r => !r.healthy).length;

    return {
      total: results.length,
      healthy,
      unhealthy,
      topics: results,
    };
  }

  /**
   * Validate topic configuration against definition
   */
  public async validateTopicConfiguration(topicName: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const definition = getTopicDefinition(topicName);
    if (!definition) {
      return {
        valid: false,
        issues: ['Topic not found in definitions'],
        recommendations: ['Remove topic or add to definitions'],
      };
    }

    try {
      const info = await this.getTopicInfo(topicName);
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check partitions
      if (info.partitions !== definition.config.partitions) {
        issues.push(`Partition count mismatch: expected ${definition.config.partitions}, got ${info.partitions}`);
        if (info.partitions < definition.config.partitions) {
          recommendations.push('Consider increasing partition count (note: cannot be decreased)');
        }
      }

      // Check replication factor
      if (info.replicationFactor !== definition.config.replicationFactor) {
        issues.push(`Replication factor mismatch: expected ${definition.config.replicationFactor}, got ${info.replicationFactor}`);
        recommendations.push('Update topic configuration to match expected replication factor');
      }

      // Check retention
      const expectedRetentionMs = definition.config.retentionDays * 24 * 60 * 60 * 1000;
      const actualRetentionMs = parseInt(info.configs['retention.ms'] || '0');
      if (actualRetentionMs !== expectedRetentionMs) {
        issues.push(`Retention mismatch: expected ${definition.config.retentionDays} days, got ${Math.round(actualRetentionMs / (24 * 60 * 60 * 1000))} days`);
        recommendations.push('Update retention.ms configuration');
      }

      // Check cleanup policy
      const expectedCleanupPolicy = definition.config.compaction ? 'compact' : 'delete';
      const actualCleanupPolicy = info.configs['cleanup.policy'] || 'delete';
      if (actualCleanupPolicy !== expectedCleanupPolicy) {
        issues.push(`Cleanup policy mismatch: expected ${expectedCleanupPolicy}, got ${actualCleanupPolicy}`);
        recommendations.push('Update cleanup.policy configuration');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Failed to validate topic: ${error instanceof Error ? error.message : 'Unknown error'}`],
        recommendations: ['Check topic exists and is accessible'],
      };
    }
  }
}

// Export singleton instance
let topicManagerInstance: TopicManager | null = null;

export const getTopicManager = (): TopicManager => {
  if (!topicManagerInstance) {
    topicManagerInstance = new TopicManager();
  }
  return topicManagerInstance;
};
