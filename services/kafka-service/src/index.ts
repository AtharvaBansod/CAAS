// Export all modules
export * from './config';
export * from './client';
export * from './topics';
export * from './schemas';
export * from './types';
export * from './utils';

// Re-export commonly used items
export { getKafkaClient, KafkaClient, ConnectionState } from './client/kafka-client';
export { getAdminClient, AdminClient } from './client/admin-client';
export { createHealthCheck, HealthCheck } from './client/health-check';
export { getTopicManager, TopicManager } from './topics/topic-manager';
export { PartitionStrategy } from './topics/partition-strategy';
export { getSchemaRegistryClient, SchemaRegistryClient } from './schemas/registry-client';
export { getSchemaValidator, SchemaValidator } from './schemas/schema-validator';
export { getMessageSerializer, MessageSerializer } from './schemas/serializer';
export { getEventBuilder, EventBuilder } from './utils/event-builder';
export { getEventParser, EventParser } from './utils/event-parser';

// Main service initialization
import { getKafkaClient } from './client/kafka-client';
import { getTopicManager } from './topics/topic-manager';
import { createHealthCheck } from './client/health-check';
import { getSchemaRegistryClient } from './schemas/registry-client';

export class KafkaService {
  private kafkaClient = getKafkaClient();
  private topicManager = getTopicManager();
  private healthCheck = createHealthCheck();
  private schemaRegistryClient = getSchemaRegistryClient();

  /**
   * Initialize the Kafka service
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing Kafka service...');

    try {
      // Connect to Kafka
      await this.kafkaClient.connect();

      // Initialize topics
      await this.topicManager.initializeAllTopics();

      // Register schemas
      await this.schemaRegistryClient.registerPlatformSchemas();

      // Perform health check
      const health = await this.healthCheck.check();
      if (!health.healthy) {
        throw new Error(`Health check failed: ${health.details.error}`);
      }

      console.log('✅ Kafka service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Kafka service...');
    
    try {
      await this.kafkaClient.gracefulShutdown();
      console.log('✅ Kafka service shutdown completed');
    } catch (error) {
      console.error('❌ Error during Kafka service shutdown:', error);
      throw error;
    }
  }

  /**
   * Get service health
   */
  public async getHealth() {
    return await this.healthCheck.check();
  }

  /**
   * Get Kafka client
   */
  public getClient() {
    return this.kafkaClient;
  }

  /**
   * Get topic manager
   */
  public getTopicManager() {
    return this.topicManager;
  }
}

// Export singleton instance
let kafkaServiceInstance: KafkaService | null = null;

export const getKafkaService = (): KafkaService => {
  if (!kafkaServiceInstance) {
    kafkaServiceInstance = new KafkaService();
  }
  return kafkaServiceInstance;
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  try {
    const service = getKafkaService();
    await service.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  try {
    const service = getKafkaService();
    await service.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// If this file is run directly, initialize the service
if (require.main === module) {
  const service = getKafkaService();
  service.initialize().catch((error) => {
    console.error('Failed to start Kafka service:', error);
    process.exit(1);
  });
}
