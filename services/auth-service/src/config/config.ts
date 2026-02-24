/**
 * Auth Service Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.AUTH_PORT || '3001', 10),
  host: process.env.AUTH_HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/caas_platform',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
    },
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT - Phase 4.5.z.x: Using HMAC (HS256) with JWT_SECRET instead of RSA key files
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    accessTokenExpiry: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '900', 10), // 15 minutes
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10), // 7 days
    issuer: process.env.JWT_ISSUER || 'caas-auth-service',
    allowExternalIssuer: (process.env.JWT_ALLOW_EXTERNAL_ISSUER || 'true').toLowerCase() === 'true',
  },

  // Inter-service authentication
  serviceSecret: process.env.SERVICE_SECRET || 'dev-service-secret',

  // Session
  session: {
    ttl: parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10), // 24 hours
    maxPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '10', 10),
    renewalThreshold: parseInt(process.env.SESSION_RENEWAL_THRESHOLD || '3600', 10), // 1 hour
  },

  // MFA
  mfa: {
    issuer: process.env.TOTP_ISSUER || 'CAAS',
    backupCodeCount: parseInt(process.env.BACKUP_CODE_COUNT || '10', 10),
    trustTokenExpiry: parseInt(process.env.TRUST_TOKEN_EXPIRY_DAYS || '30', 10),
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://gateway:3000'],
    credentials: true,
  },

  // Kafka (for audit events)
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: 'auth-service',
    groupId: 'auth-service-group',
  },
};
