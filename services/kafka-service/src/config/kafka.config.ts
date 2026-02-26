import { KafkaConfig, ProducerConfig, ConsumerConfig } from 'kafkajs';
import { env, getBrokers, getSecurityConfig } from './environment';

export const createKafkaConfig = (): KafkaConfig => {
  const baseConfig: KafkaConfig = {
    clientId: env.KAFKA_CLIENT_ID,
    brokers: getBrokers(),
    connectionTimeout: env.KAFKA_CONNECTION_TIMEOUT,
    requestTimeout: env.KAFKA_REQUEST_TIMEOUT,
    retry: {
      initialRetryTime: 100,
      retries: 8,
      maxRetryTime: 30000,
      factor: 2,
      multiplier: 2,
      restartOnFailure: async (e) => {
        console.error('Kafka client restart on failure:', e);
        return true;
      },
    },
    logLevel: env.NODE_ENV === 'development' ? 2 : 1, // INFO in dev, WARN in prod
  };

  // Add security configuration if enabled
  const securityConfig = getSecurityConfig();
  return { ...baseConfig, ...securityConfig };
};

export const createProducerConfig = (): ProducerConfig => {
  return {
    maxInFlightRequests: 5,
    idempotent: true,
    transactionTimeout: 30000,
    acks: env.PRODUCER_ACKS as any,
    compression: env.PRODUCER_COMPRESSION as any,
    batch: {
      size: env.PRODUCER_BATCH_SIZE,
      lingerMs: env.PRODUCER_LINGER_MS,
    },
    retry: {
      initialRetryTime: env.RETRY_INITIAL_DELAY_MS,
      retries: env.MAX_RETRIES,
      maxRetryTime: env.RETRY_MAX_DELAY_MS,
    },
  };
};

export const createConsumerConfig = (groupId: string): ConsumerConfig => {
  return {
    groupId,
    sessionTimeout: env.CONSUMER_SESSION_TIMEOUT_MS,
    rebalanceTimeout: 60000,
    heartbeatInterval: 10000,
    maxBytesPerPartition: 1048576, // 1MB
    minBytes: 1,
    maxBytes: 10485760, // 10MB
    maxWaitTimeInMs: 5000,
    retry: {
      initialRetryTime: env.RETRY_INITIAL_DELAY_MS,
      retries: env.MAX_RETRIES,
      maxRetryTime: env.RETRY_MAX_DELAY_MS,
    },
    readUncommitted: false,
    maxInFlightRequests: 1, // Ensure ordering
  };
};

export const createAdminConfig = () => {
  return {
    retry: {
      initialRetryTime: 100,
      retries: 5,
      maxRetryTime: 30000,
    },
  };
};
