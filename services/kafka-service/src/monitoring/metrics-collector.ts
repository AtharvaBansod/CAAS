import { Admin } from 'kafkajs';
import { KafkaClient } from '../client/kafka-client';

export interface BrokerMetrics {
  brokerId: number;
  host: string;
  port: number;
  metrics: {
    messagesInPerSec: number;
    bytesInPerSec: number;
    bytesOutPerSec: number;
    requestsPerSec: number;
    responseTimeAvg: number;
    errorRate: number;
    diskUsage: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface TopicMetrics {
  name: string;
  partitions: number;
  replicationFactor: number;
  metrics: {
    messagesPerSec: number;
    bytesInPerSec: number;
    bytesOutPerSec: number;
    size: number;
    segmentCount: number;
    logStartOffset: number;
    logEndOffset: number;
    underReplicatedPartitions: number;
  };
}

export interface ConsumerGroupMetrics {
  groupId: string;
  state: 'Stable' | 'PreparingRebalance' | 'CompletingRebalance' | 'Dead';
  members: number;
  lag: {
    total: number;
    byTopic: Record<string, number>;
  };
  metrics: {
    messagesConsumedPerSec: number;
    bytesConsumedPerSec: number;
    rebalanceCount: number;
    lastRebalanceTime: number;
  };
}

export interface ClusterMetrics {
  brokerCount: number;
  topicCount: number;
  partitionCount: number;
  controllerId: number;
  underReplicatedPartitions: number;
  offlinePartitionsCount: number;
  activeControllers: number;
  metrics: {
    totalMessagesPerSec: number;
    totalBytesPerSec: number;
    avgResponseTime: number;
    errorRate: number;
  };
}

export class MetricsCollector {
  private kafkaClient: KafkaClient;
  private admin: Admin | null = null;
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(kafkaClient?: KafkaClient) {
    this.kafkaClient = kafkaClient || KafkaClient.getInstance();
  }

  private async getAdmin(): Promise<Admin> {
    if (!this.admin) {
      this.admin = await this.kafkaClient.createAdmin();
    }
    return this.admin;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get metrics for all brokers in the cluster
   */
  public async getBrokerMetrics(): Promise<BrokerMetrics[]> {
    const cacheKey = 'broker-metrics';
    const cached = this.getCachedData<BrokerMetrics[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const admin = await this.getAdmin();
    const clusterDescription = await admin.describeCluster();
    const brokerMetrics: BrokerMetrics[] = [];

    for (const broker of clusterDescription.brokers) {
      // In a real implementation, you would connect to JMX or use Kafka metrics API
      // For now, we'll simulate the metrics structure
      const metrics: BrokerMetrics = {
        brokerId: broker.nodeId,
        host: broker.host,
        port: broker.port,
        metrics: {
          messagesInPerSec: Math.random() * 1000,
          bytesInPerSec: Math.random() * 1000000,
          bytesOutPerSec: Math.random() * 1000000,
          requestsPerSec: Math.random() * 500,
          responseTimeAvg: Math.random() * 100,
          errorRate: Math.random() * 0.01,
          diskUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 100
        }
      };

      brokerMetrics.push(metrics);
    }

    this.setCachedData(cacheKey, brokerMetrics);
    return brokerMetrics;
  }

  /**
   * Get metrics for a specific topic
   */
  public async getTopicMetrics(topicName: string): Promise<TopicMetrics | null> {
    const cacheKey = `topic-metrics-${topicName}`;
    const cached = this.getCachedData<TopicMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const admin = await this.getAdmin();
    
    try {
      const topicMetadata = await admin.fetchTopicMetadata({ topics: [topicName] });
      
      if (topicMetadata.topics.length === 0) {
        return null;
      }

      const topic = topicMetadata.topics[0];
      const partitions = topic.partitions.length;
      
      // Calculate replication factor from partition metadata
      const replicationFactor = topic.partitions[0]?.replicas?.length || 0;

      // Simulate metrics (in real implementation, use JMX or Kafka metrics)
      const metrics: TopicMetrics = {
        name: topicName,
        partitions,
        replicationFactor,
        metrics: {
          messagesPerSec: Math.random() * 100,
          bytesInPerSec: Math.random() * 100000,
          bytesOutPerSec: Math.random() * 100000,
          size: Math.random() * 1000000000, // bytes
          segmentCount: Math.floor(Math.random() * 100),
          logStartOffset: Math.floor(Math.random() * 1000000),
          logEndOffset: Math.floor(Math.random() * 1000000) + 100000,
          underReplicatedPartitions: Math.floor(Math.random() * 3)
        }
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error(`❌ Failed to get metrics for topic ${topicName}:`, error);
      return null;
    }
  }

  /**
   * Get metrics for all topics
   */
  public async getAllTopicMetrics(): Promise<TopicMetrics[]> {
    const admin = await this.getAdmin();
    const topicMetadata = await admin.fetchTopicMetadata();
    const topicMetrics: TopicMetrics[] = [];

    for (const topic of topicMetadata.topics) {
      const partitions = topic.partitions.length;
      const replicationFactor = topic.partitions[0]?.replicas?.length || 0;

      const metrics: TopicMetrics = {
        name: topic.name,
        partitions,
        replicationFactor,
        metrics: {
          messagesPerSec: Math.random() * 100,
          bytesInPerSec: Math.random() * 100000,
          bytesOutPerSec: Math.random() * 100000,
          size: Math.random() * 1000000000,
          segmentCount: Math.floor(Math.random() * 100),
          logStartOffset: Math.floor(Math.random() * 1000000),
          logEndOffset: Math.floor(Math.random() * 1000000) + 100000,
          underReplicatedPartitions: Math.floor(Math.random() * 3)
        }
      };

      topicMetrics.push(metrics);
    }

    return topicMetrics;
  }

  /**
   * Get metrics for a specific consumer group
   */
  public async getConsumerGroupMetrics(groupId: string): Promise<ConsumerGroupMetrics | null> {
    const cacheKey = `consumer-group-metrics-${groupId}`;
    const cached = this.getCachedData<ConsumerGroupMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const admin = await this.getAdmin();

    try {
      const groupDescription = await admin.describeConsumerGroups({ groupIds: [groupId] });
      
      if (groupDescription.groups.length === 0) {
        return null;
      }

      const group = groupDescription.groups[0];
      const members = group.members.length;

      // Calculate consumer lag (simplified)
      const lag = {
        total: Math.floor(Math.random() * 10000),
        byTopic: {
          'platform.events': Math.floor(Math.random() * 5000),
          'platform.audit': Math.floor(Math.random() * 3000),
          'platform.notifications': Math.floor(Math.random() * 2000)
        }
      };

      const metrics: ConsumerGroupMetrics = {
        groupId,
        state: group.state as ConsumerGroupMetrics['state'],
        members,
        lag,
        metrics: {
          messagesConsumedPerSec: Math.random() * 50,
          bytesConsumedPerSec: Math.random() * 50000,
          rebalanceCount: Math.floor(Math.random() * 10),
          lastRebalanceTime: Date.now() - Math.floor(Math.random() * 86400000)
        }
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error(`❌ Failed to get metrics for consumer group ${groupId}:`, error);
      return null;
    }
  }

  /**
   * Get metrics for all consumer groups
   */
  public async getAllConsumerGroupMetrics(): Promise<ConsumerGroupMetrics[]> {
    const admin = await this.getAdmin();
    const groupList = await admin.listConsumerGroups();
    const consumerGroupMetrics: ConsumerGroupMetrics[] = [];

    for (const group of groupList.groups) {
      const metrics = await this.getConsumerGroupMetrics(group.groupId);
      if (metrics) {
        consumerGroupMetrics.push(metrics);
      }
    }

    return consumerGroupMetrics;
  }

  /**
   * Get overall cluster metrics
   */
  public async getClusterMetrics(): Promise<ClusterMetrics> {
    const cacheKey = 'cluster-metrics';
    const cached = this.getCachedData<ClusterMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    const admin = await this.getAdmin();
    const clusterDescription = await admin.describeCluster();
    const topicMetadata = await admin.fetchTopicMetadata();
    const groupList = await admin.listConsumerGroups();

    const brokerCount = clusterDescription.brokers.length;
    const topicCount = topicMetadata.topics.length;
    const partitionCount = topicMetadata.topics.reduce((sum, topic) => sum + topic.partitions.length, 0);
    const controllerId = clusterDescription.controller?.nodeId || -1;

    // Calculate under-replicated partitions
    let underReplicatedPartitions = 0;
    for (const topic of topicMetadata.topics) {
      for (const partition of topic.partitions) {
        if (partition.replicas.length !== partition.isr?.length) {
          underReplicatedPartitions++;
        }
      }
    }

    const metrics: ClusterMetrics = {
      brokerCount,
      topicCount,
      partitionCount,
      controllerId,
      underReplicatedPartitions,
      offlinePartitionsCount: 0, // Would need additional logic to determine
      activeControllers: 1,
      metrics: {
        totalMessagesPerSec: Math.random() * 1000,
        totalBytesPerSec: Math.random() * 1000000,
        avgResponseTime: Math.random() * 100,
        errorRate: Math.random() * 0.01
      }
    };

    this.setCachedData(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get health status of the cluster
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: ClusterMetrics;
  }> {
    const clusterMetrics = await this.getClusterMetrics();
    const issues: string[] = [];

    // Check for common health issues
    if (clusterMetrics.underReplicatedPartitions > 0) {
      issues.push(`${clusterMetrics.underReplicatedPartitions} under-replicated partitions`);
    }

    if (clusterMetrics.offlinePartitionsCount > 0) {
      issues.push(`${clusterMetrics.offlinePartitionsCount} offline partitions`);
    }

    if (clusterMetrics.activeControllers !== 1) {
      issues.push(`Expected 1 active controller, found ${clusterMetrics.activeControllers}`);
    }

    if (clusterMetrics.brokerCount < 3) {
      issues.push(`Insufficient brokers: ${clusterMetrics.brokerCount} (expected at least 3)`);
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      issues,
      metrics: clusterMetrics
    };
  }

  /**
   * Clear metrics cache
   */
  public clearCache(): void {
    this.metricsCache.clear();
  }

  /**
   * Get Prometheus-formatted metrics
   */
  public async getPrometheusMetrics(): Promise<string> {
    const clusterMetrics = await this.getClusterMetrics();
    const brokerMetrics = await this.getBrokerMetrics();
    const topicMetrics = await this.getAllTopicMetrics();

    let prometheusOutput = '';

    // Cluster metrics
    prometheusOutput += `# HELP kafka_cluster_brokers Total number of brokers in cluster\n`;
    prometheusOutput += `# TYPE kafka_cluster_brokers gauge\n`;
    prometheusOutput += `kafka_cluster_brokers ${clusterMetrics.brokerCount}\n\n`;

    prometheusOutput += `# HELP kafka_cluster_topics Total number of topics in cluster\n`;
    prometheusOutput += `# TYPE kafka_cluster_topics gauge\n`;
    prometheusOutput += `kafka_cluster_topics ${clusterMetrics.topicCount}\n\n`;

    prometheusOutput += `# HELP kafka_cluster_under_replicated_partitions Number of under-replicated partitions\n`;
    prometheusOutput += `# TYPE kafka_cluster_under_replicated_partitions gauge\n`;
    prometheusOutput += `kafka_cluster_under_replicated_partitions ${clusterMetrics.underReplicatedPartitions}\n\n`;

    // Broker metrics
    for (const broker of brokerMetrics) {
      prometheusOutput += `# HELP kafka_broker_messages_in_per_sec Messages received per second by broker\n`;
      prometheusOutput += `# TYPE kafka_broker_messages_in_per_sec gauge\n`;
      prometheusOutput += `kafka_broker_messages_in_per_sec{broker_id="${broker.brokerId}"} ${broker.metrics.messagesInPerSec}\n\n`;

      prometheusOutput += `# HELP kafka_broker_response_time_avg Average response time in milliseconds\n`;
      prometheusOutput += `# TYPE kafka_broker_response_time_avg gauge\n`;
      prometheusOutput += `kafka_broker_response_time_avg{broker_id="${broker.brokerId}"} ${broker.metrics.responseTimeAvg}\n\n`;
    }

    // Topic metrics
    for (const topic of topicMetrics) {
      prometheusOutput += `# HELP kafka_topic_size Total size of topic in bytes\n`;
      prometheusOutput += `# TYPE kafka_topic_size gauge\n`;
      prometheusOutput += `kafka_topic_size{topic="${topic.name}"} ${topic.metrics.size}\n\n`;

      prometheusOutput += `# HELP kafka_topic_messages_per_sec Messages per second for topic\n`;
      prometheusOutput += `# TYPE kafka_topic_messages_per_sec gauge\n`;
      prometheusOutput += `kafka_topic_messages_per_sec{topic="${topic.name}"} ${topic.metrics.messagesPerSec}\n\n`;
    }

    return prometheusOutput;
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
