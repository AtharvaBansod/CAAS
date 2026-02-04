import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const environmentSchema = z.object({
  // Kafka Cluster
  KAFKA_BROKERS: z.string().default('kafka-1:29092,kafka-2:29092,kafka-3:29092'),
  KAFKA_CLIENT_ID: z.string().default('caas-service'),
  KAFKA_CONNECTION_TIMEOUT: z.coerce.number().default(10000),
  KAFKA_REQUEST_TIMEOUT: z.coerce.number().default(30000),

  // Schema Registry
  SCHEMA_REGISTRY_URL: z.string().default('http://schema-registry:8081'),
  SCHEMA_COMPATIBILITY_MODE: z.enum(['BACKWARD', 'FORWARD', 'FULL', 'NONE']).default('BACKWARD'),

  // Producer Configuration
  PRODUCER_ACKS: z.enum(['-1', '0', '1', 'all']).default('all'),
  PRODUCER_COMPRESSION: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).default('snappy'),
  PRODUCER_BATCH_SIZE: z.coerce.number().default(16384),
  PRODUCER_LINGER_MS: z.coerce.number().default(5),

  // Consumer Configuration
  CONSUMER_GROUP_ID: z.string().default('caas-consumer-group'),
  CONSUMER_MAX_POLL_RECORDS: z.coerce.number().default(500),
  CONSUMER_SESSION_TIMEOUT_MS: z.coerce.number().default(30000),

  // Security
  KAFKA_SASL_ENABLED: z.coerce.boolean().default(false),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  KAFKA_SSL_ENABLED: z.coerce.boolean().default(false),

  // Monitoring
  JMX_PORT: z.coerce.number().default(9999),
  LAG_ALERT_THRESHOLD: z.coerce.number().default(1000),

  // Error Handling
  MAX_RETRIES: z.coerce.number().default(3),
  RETRY_INITIAL_DELAY_MS: z.coerce.number().default(100),
  RETRY_MAX_DELAY_MS: z.coerce.number().default(30000),
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_RESET_MS: z.coerce.number().default(60000),

  // Topic Configuration
  DEFAULT_PARTITIONS: z.coerce.number().default(3),
  DEFAULT_REPLICATION_FACTOR: z.coerce.number().default(3),
  MESSAGE_RETENTION_DAYS: z.coerce.number().default(30),

  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Environment = z.infer<typeof environmentSchema>;

let env: Environment;

try {
  env = environmentSchema.parse(process.env);
} catch (error) {
  console.error('❌ Invalid environment configuration:', error);
  process.exit(1);
}

export { env };

// Helper functions
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// Kafka brokers as array
export const getBrokers = (): string[] => {
  return env.KAFKA_BROKERS.split(',').map(broker => broker.trim());
};

// Security configuration
export const getSecurityConfig = () => {
  if (!env.KAFKA_SASL_ENABLED) {
    return {};
  }

  return {
    sasl: {
      mechanism: 'scram-sha-512' as const,
      username: env.KAFKA_SASL_USERNAME!,
      password: env.KAFKA_SASL_PASSWORD!,
    },
    ssl: env.KAFKA_SSL_ENABLED,
  };
};