export const config = {
  // Server
  port: parseInt(process.env.PORT || '3009'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/caas_crypto',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: 'crypto:',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000'), // 1 hour
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    authTagLength: 16,
  },

  // Key Management
  keyManagement: {
    rotationInterval: 86400000 * 90, // 90 days
    keyExpiry: 86400000 * 365, // 1 year
  },
};
