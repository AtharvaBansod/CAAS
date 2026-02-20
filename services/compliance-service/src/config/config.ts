export const config = {
  // Server
  port: parseInt(process.env.PORT || '3008'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/caas_compliance',
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
    keyPrefix: 'compliance:',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000'), // 1 hour
  },

  // GDPR
  gdpr: {
    exportFormat: 'json',
    exportTimeout: 300000, // 5 minutes
    erasureVerification: true,
  },

  // Audit
  audit: {
    hashAlgorithm: 'sha256',
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
  },

  // Retention
  retention: {
    defaultRetentionDays: 365,
    executionInterval: 86400000, // 24 hours
    batchSize: 1000,
  },
};
