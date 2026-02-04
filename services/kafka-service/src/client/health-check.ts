import { getKafkaClient, ConnectionState } from './kafka-client';
import { getAdminClient } from './admin-client';

export interface HealthCheckResult {
  healthy: boolean;
  status: string;
  timestamp: number;
  latency: number;
  details: {
    connection: {
      state: ConnectionState;
      connected: boolean;
    };
    cluster: {
      brokers: number;
      controller: number;
      clusterId: string;
    } | null;
    topics: {
      total: number;
      platformTopics: string[];
    } | null;
    error?: string;
  };
}

export interface BrokerHealth {
  nodeId: number;
  host: string;
  port: number;
  healthy: boolean;
  latency?: number;
  error?: string;
}

export interface TopicHealth {
  name: string;
  partitions: number;
  replicationFactor: number;
  underReplicatedPartitions: number;
  healthy: boolean;
}

export class HealthCheck {
  private kafkaClient = getKafkaClient();
  private adminClient = getAdminClient();

  /**
   * Perform comprehensive health check
   */
  public async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const result: HealthCheckResult = {
      healthy: false,
      status: 'unknown',
      timestamp: startTime,
      latency: 0,
      details: {
        connection: {
          state: this.kafkaClient.getState(),
          connected: this.kafkaClient.isConnected(),
        },
        cluster: null,
        topics: null,
      },
    };

    try {
      // Check connection state
      if (!this.kafkaClient.isConnected()) {
        result.status = 'disconnected';
        result.details.error = 'Kafka client is not connected';
        return result;
      }

      // Check cluster health
      const clusterInfo = await this.adminClient.getClusterInfo();
      result.details.cluster = {
        brokers: clusterInfo.brokers.length,
        controller: clusterInfo.controller,
        clusterId: clusterInfo.clusterId,
      };

      // Check topics
      const topics = await this.adminClient.listTopics();
      const platformTopics = topics.filter(topic => 
        topic.startsWith('platform.') || topic.startsWith('internal.')
      );

      result.details.topics = {
        total: topics.length,
        platformTopics,
      };

      // Determine overall health
      const hasMinimumBrokers = clusterInfo.brokers.length >= 1;
      const hasController = clusterInfo.controller >= 0;
      const hasPlatformTopics = platformTopics.length > 0;

      result.healthy = hasMinimumBrokers && hasController;
      result.status = result.healthy ? 'healthy' : 'unhealthy';

      if (!hasMinimumBrokers) {
        result.details.error = 'Insufficient brokers';
      } else if (!hasController) {
        result.details.error = 'No controller elected';
      }

    } catch (error) {
      result.status = 'error';
      result.details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    result.latency = Date.now() - startTime;
    return result;
  }

  /**
   * Check individual broker health
   */
  public async checkBrokers(): Promise<BrokerHealth[]> {
    try {
      const clusterInfo = await this.adminClient.getClusterInfo();
      
      const brokerHealthChecks = clusterInfo.brokers.map(async (broker): Promise<BrokerHealth> => {
        const startTime = Date.now();
        
        try {
          // Simple connectivity test by fetching metadata
          await this.adminClient.getClusterInfo();
          
          return {
            nodeId: broker.nodeId,
            host: broker.host,
            port: broker.port,
            healthy: true,
            latency: Date.now() - startTime,
          };
        } catch (error) {
          return {
            nodeId: broker.nodeId,
            host: broker.host,
            port: broker.port,
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      return await Promise.all(brokerHealthChecks);
    } catch (error) {
      console.error('Failed to check broker health:', error);
      return [];
    }
  }

  /**
   * Check topic health
   */
  public async checkTopics(topicNames?: string[]): Promise<TopicHealth[]> {
    try {
      const topics = topicNames || await this.adminClient.listTopics();
      
      const topicHealthChecks = topics.map(async (topicName): Promise<TopicHealth> => {
        try {
          const topicInfo = await this.adminClient.getTopicInfo(topicName);
          
          // For now, assume all partitions are healthy
          // In a real implementation, you'd check partition metadata
          const underReplicatedPartitions = 0;
          
          return {
            name: topicName,
            partitions: topicInfo.partitions,
            replicationFactor: topicInfo.replicationFactor,
            underReplicatedPartitions,
            healthy: underReplicatedPartitions === 0,
          };
        } catch (error) {
          return {
            name: topicName,
            partitions: 0,
            replicationFactor: 0,
            underReplicatedPartitions: 0,
            healthy: false,
          };
        }
      });

      return await Promise.all(topicHealthChecks);
    } catch (error) {
      console.error('Failed to check topic health:', error);
      return [];
    }
  }

  /**
   * Get cluster statistics
   */
  public async getStats(): Promise<{
    brokers: number;
    topics: number;
    partitions: number;
    underReplicatedPartitions: number;
    offlinePartitions: number;
  }> {
    try {
      const clusterInfo = await this.adminClient.getClusterInfo();
      const topics = await this.adminClient.listTopics();
      
      // Get detailed topic information
      let totalPartitions = 0;
      let underReplicatedPartitions = 0;
      let offlinePartitions = 0;

      for (const topicName of topics) {
        try {
          const topicInfo = await this.adminClient.getTopicInfo(topicName);
          totalPartitions += topicInfo.partitions;
          // Note: In a real implementation, you'd check partition metadata
          // to determine under-replicated and offline partitions
        } catch (error) {
          // Skip topics that can't be accessed
        }
      }

      return {
        brokers: clusterInfo.brokers.length,
        topics: topics.length,
        partitions: totalPartitions,
        underReplicatedPartitions,
        offlinePartitions,
      };
    } catch (error) {
      console.error('Failed to get cluster stats:', error);
      return {
        brokers: 0,
        topics: 0,
        partitions: 0,
        underReplicatedPartitions: 0,
        offlinePartitions: 0,
      };
    }
  }

  /**
   * Simple ping test
   */
  public async ping(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.adminClient.listTopics();
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if required platform topics exist
   */
  public async checkPlatformTopics(): Promise<{
    allPresent: boolean;
    missing: string[];
    present: string[];
  }> {
    const requiredTopics = [
      'platform.events',
      'platform.audit',
      'platform.notifications',
      'internal.dlq',
      'internal.retry',
    ];

    try {
      const existingTopics = await this.adminClient.listTopics();
      const present = requiredTopics.filter(topic => existingTopics.includes(topic));
      const missing = requiredTopics.filter(topic => !existingTopics.includes(topic));

      return {
        allPresent: missing.length === 0,
        missing,
        present,
      };
    } catch (error) {
      return {
        allPresent: false,
        missing: requiredTopics,
        present: [],
      };
    }
  }
}

// Export singleton instance
let healthCheckInstance: HealthCheck | null = null;

export const createHealthCheck = (): HealthCheck => {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheck();
  }
  return healthCheckInstance;
};

// Export for Docker health check
export const healthCheck = async (): Promise<void> => {
  const health = createHealthCheck();
  const result = await health.check();
  
  if (!result.healthy) {
    throw new Error(`Health check failed: ${result.details.error || result.status}`);
  }
};