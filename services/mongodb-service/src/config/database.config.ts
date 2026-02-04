import { MongoClientOptions } from 'mongodb';
import { ConnectOptions } from 'mongoose';
import { getEnvironment } from './environment';

/**
 * Database Configuration Interface
 */
export interface DatabaseConfig {
  uri: string;
  database: string;
  options: MongoClientOptions;
}

/**
 * Mongoose Connection Options
 */
export interface MongooseConnectionOptions extends ConnectOptions {
  dbName: string;
}

/**
 * Get MongoDB Connection Options
 */
export function getConnectionOptions(): MongoClientOptions {
  const env = getEnvironment();

  return {
    // Connection Pool
    minPoolSize: env.MONGODB_MIN_POOL_SIZE,
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
    maxIdleTimeMS: env.MONGODB_MAX_IDLE_TIME_MS,
    waitQueueTimeoutMS: env.MONGODB_WAIT_QUEUE_TIMEOUT_MS,

    // Timeouts
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: env.MONGODB_SOCKET_TIMEOUT_MS,
    connectTimeoutMS: env.MONGODB_CONNECT_TIMEOUT_MS,

    // Retry Logic
    retryWrites: env.MONGODB_RETRY_WRITES,
    retryReads: env.MONGODB_RETRY_READS,

    // Application Name
    appName: 'caas-mongodb-service',

    // Compression
    compressors: ['snappy', 'zlib'],

    // Read Preference
    readPreference: 'primaryPreferred',

    // Write Concern
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeoutMS: 5000,
    },

    // Read Concern
    readConcern: {
      level: 'majority',
    },
  };
}

/**
 * Get Mongoose Connection Options
 */
export function getMongooseOptions(database?: string): MongooseConnectionOptions {
  const env = getEnvironment();
  const mongoOptions = getConnectionOptions();

  return {
    ...mongoOptions,
    dbName: database || env.MONGODB_DATABASE,
    autoIndex: env.NODE_ENV === 'development',
    autoCreate: env.NODE_ENV === 'development',
  };
}

/**
 * Get Database Configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = getEnvironment();

  return {
    uri: env.MONGODB_URI,
    database: env.MONGODB_DATABASE,
    options: getConnectionOptions(),
  };
}

/**
 * Get Tenant Database Name
 */
export function getTenantDatabaseName(tenantId: string): string {
  return `caas_tenant_${tenantId}`;
}

/**
 * Validate Tenant ID Format
 */
export function isValidTenantId(tenantId: string): boolean {
  // Tenant ID should be alphanumeric, 6-32 characters
  return /^[a-zA-Z0-9_-]{6,32}$/.test(tenantId);
}
