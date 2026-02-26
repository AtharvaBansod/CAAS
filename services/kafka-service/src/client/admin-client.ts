import { Admin, ITopicConfig, ConfigResourceTypes, ResourceConfigQuery } from 'kafkajs';
import { getKafkaClient } from './kafka-client';
import { env } from '../config/environment';

export interface TopicConfig {
  topic: string;
  numPartitions?: number;
  replicationFactor?: number;
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
}

export interface ClusterInfo {
  clusterId: string;
  brokers: Array<{
    nodeId: number;
    host: string;
    port: number;
  }>;
  controller: number;
}

export class AdminClient {
  private admin: Admin | null = null;

  constructor() {}

  private async getAdmin(): Promise<Admin> {
    if (!this.admin) {
      const kafkaClient = getKafkaClient();
      this.admin = await kafkaClient.createAdmin();
    }
    return this.admin;
  }

  /**
   * Create a single topic
   */
  public async createTopic(config: TopicConfig): Promise<void> {
    const admin = await this.getAdmin();

    const topicConfig: ITopicConfig = {
      topic: config.topic,
      numPartitions: config.numPartitions || env.DEFAULT_PARTITIONS,
      replicationFactor: config.replicationFactor || env.DEFAULT_REPLICATION_FACTOR,
      configEntries: config.configEntries || [],
    };

    try {
      await admin.createTopics({
        topics: [topicConfig],
        waitForLeaders: true,
        timeout: 30000,
      });

      console.log(`✅ Topic created: ${config.topic}`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`ℹ️ Topic already exists: ${config.topic}`);
      } else {
        console.error(`❌ Failed to create topic ${config.topic}:`, error);
        throw error;
      }
    }
  }

  /**
   * Create multiple topics
   */
  public async createTopics(configs: TopicConfig[]): Promise<void> {
    const admin = await this.getAdmin();

    const topicConfigs: ITopicConfig[] = configs.map(config => ({
      topic: config.topic,
      numPartitions: config.numPartitions || env.DEFAULT_PARTITIONS,
      replicationFactor: config.replicationFactor || env.DEFAULT_REPLICATION_FACTOR,
      configEntries: config.configEntries || [],
    }));

    try {
      await admin.createTopics({
        topics: topicConfigs,
        waitForLeaders: true,
        timeout: 30000,
      });

      console.log(`✅ Created ${configs.length} topics`);
    } catch (error: any) {
      console.error('❌ Failed to create topics:', error);
      throw error;
    }
  }

  /**
   * Delete topics
   */
  public async deleteTopics(topics: string[]): Promise<void> {
    const admin = await this.getAdmin();

    try {
      await admin.deleteTopics({
        topics,
        timeout: 30000,
      });

      console.log(`✅ Deleted topics: ${topics.join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to delete topics:', error);
      throw error;
    }
  }

  /**
   * List all topics
   */
  public async listTopics(): Promise<string[]> {
    const admin = await this.getAdmin();

    try {
      const metadata = await admin.fetchTopicMetadata();
      return metadata.topics.map(topic => topic.name);
    } catch (error) {
      console.error('❌ Failed to list topics:', error);
      throw error;
    }
  }

  /**
   * Get detailed topic information
   */
  public async getTopicInfo(topicName: string): Promise<TopicInfo> {
    const admin = await this.getAdmin();

    try {
      // Get topic metadata
      const metadata = await admin.fetchTopicMetadata({ topics: [topicName] });
      const topic = metadata.topics.find(t => t.name === topicName);

      if (!topic) {
        throw new Error(`Topic ${topicName} not found`);
      }

      // Get topic configuration
      const configResponse = await admin.describeConfigs({
        resources: [
          {
            type: ConfigResourceTypes.TOPIC,
            name: topicName,
          },
        ],
      });

      const configs: Record<string, string> = {};
      const topicConfig = configResponse.resources.find(r => r.resourceName === topicName);
      if (topicConfig) {
        topicConfig.configEntries.forEach(entry => {
          configs[entry.configName] = entry.configValue;
        });
      }

      return {
        name: topic.name,
        partitions: topic.partitions.length,
        replicationFactor: topic.partitions[0]?.replicas.length || 0,
        configs,
      };
    } catch (error) {
      console.error(`❌ Failed to get topic info for ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Update topic configuration
   */
  public async updateTopicConfig(
    topicName: string,
    configEntries: Array<{ name: string; value: string }>
  ): Promise<void> {
    const admin = await this.getAdmin();

    try {
      await admin.alterConfigs({
        resources: [
          {
            type: ConfigResourceTypes.TOPIC,
            name: topicName,
            configEntries,
          },
        ],
      });

      console.log(`✅ Updated configuration for topic: ${topicName}`);
    } catch (error) {
      console.error(`❌ Failed to update topic config for ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Get cluster information
   */
  public async getClusterInfo(): Promise<ClusterInfo> {
    const admin = await this.getAdmin();

    try {
      const metadata = await admin.fetchTopicMetadata();
      
      return {
        clusterId: metadata.clusterId || 'unknown',
        brokers: metadata.brokers.map(broker => ({
          nodeId: broker.nodeId,
          host: broker.host,
          port: broker.port,
        })),
        controller: metadata.controller || -1,
      };
    } catch (error) {
      console.error('❌ Failed to get cluster info:', error);
      throw error;
    }
  }

  /**
   * Create tenant-specific topics
   */
  public async createTenantTopics(tenantId: string): Promise<void> {
    const topics: TopicConfig[] = [
      {
        topic: `chat.messages.${tenantId}`,
        numPartitions: 16,
        configEntries: [
          { name: 'retention.ms', value: String(30 * 24 * 60 * 60 * 1000) }, // 30 days
          { name: 'segment.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
        ],
      },
      {
        topic: `chat.events.${tenantId}`,
        numPartitions: 8,
        configEntries: [
          { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
        ],
      },
      {
        topic: `presence.${tenantId}`,
        numPartitions: 4,
        configEntries: [
          { name: 'retention.ms', value: String(24 * 60 * 60 * 1000) }, // 1 day
          { name: 'cleanup.policy', value: 'compact' },
          { name: 'segment.ms', value: String(60 * 60 * 1000) }, // 1 hour
        ],
      },
      {
        topic: `analytics.${tenantId}`,
        numPartitions: 8,
        configEntries: [
          { name: 'retention.ms', value: String(90 * 24 * 60 * 60 * 1000) }, // 90 days
        ],
      },
      {
        topic: `notifications.${tenantId}`,
        numPartitions: 4,
        configEntries: [
          { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
        ],
      },
    ];

    await this.createTopics(topics);
    console.log(`✅ Created tenant topics for: ${tenantId}`);
  }

  /**
   * Delete tenant-specific topics
   */
  public async deleteTenantTopics(tenantId: string): Promise<void> {
    const topics = [
      `chat.messages.${tenantId}`,
      `chat.events.${tenantId}`,
      `presence.${tenantId}`,
      `analytics.${tenantId}`,
      `notifications.${tenantId}`,
    ];

    await this.deleteTopics(topics);
    console.log(`✅ Deleted tenant topics for: ${tenantId}`);
  }

  /**
   * Create platform topics (called once during setup)
   */
  public async createPlatformTopics(): Promise<void> {
    const topics: TopicConfig[] = [
      {
        topic: 'platform.events',
        numPartitions: 8,
        configEntries: [
          { name: 'retention.ms', value: String(30 * 24 * 60 * 60 * 1000) }, // 30 days
        ],
      },
      {
        topic: 'platform.audit',
        numPartitions: 8,
        configEntries: [
          { name: 'retention.ms', value: String(365 * 24 * 60 * 60 * 1000) }, // 365 days
        ],
      },
      {
        topic: 'platform.notifications',
        numPartitions: 4,
        configEntries: [
          { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
        ],
      },
      {
        topic: 'internal.dlq',
        numPartitions: 4,
        configEntries: [
          { name: 'retention.ms', value: String(30 * 24 * 60 * 60 * 1000) }, // 30 days
        ],
      },
      {
        topic: 'internal.retry',
        numPartitions: 4,
        configEntries: [
          { name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }, // 7 days
        ],
      },
    ];

    await this.createTopics(topics);
    console.log('✅ Created platform topics');
  }

  /**
   * Disconnect admin client
   */
  public async disconnect(): Promise<void> {
    if (this.admin) {
      await this.admin.disconnect();
      this.admin = null;
      console.log('✅ Admin client disconnected');
    }
  }
}

// Export singleton instance
let adminClientInstance: AdminClient | null = null;

export const getAdminClient = (): AdminClient => {
  if (!adminClientInstance) {
    adminClientInstance = new AdminClient();
  }
  return adminClientInstance;
};
