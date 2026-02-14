import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3005),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  mongodb: z.object({
    uri: z.string(),
    dbName: z.string().default('caas_platform'),
  }),
  s3: z.object({
    endpoint: z.string(),
    bucket: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    region: z.string().default('us-east-1'),
  }),
  redis: z.object({
    url: z.string(),
  }),
  kafka: z.object({
    brokers: z.array(z.string()),
    clientId: z.string().default('media-service'),
  }),
  jwt: z.object({
    publicKey: z.string(),
  }),
  upload: z.object({
    maxFileSizeMB: z.number().default(100),
    chunkSizeMB: z.number().default(5),
    timeoutMs: z.number().default(300000),
  }),
  download: z.object({
    signedUrlExpirySeconds: z.number().default(3600),
    rateLimitKbps: z.number().default(10240),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const config = {
    port: parseInt(process.env.PORT || '3005', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'caas_platform',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
      bucket: process.env.S3_BUCKET || 'caas-media',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
      region: process.env.S3_REGION || 'us-east-1',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'media-service',
    },
    jwt: {
      publicKey: process.env.JWT_PUBLIC_KEY || '',
    },
    upload: {
      maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
      chunkSizeMB: parseInt(process.env.CHUNK_SIZE_MB || '5', 10),
      timeoutMs: parseInt(process.env.UPLOAD_TIMEOUT_MS || '300000', 10),
    },
    download: {
      signedUrlExpirySeconds: parseInt(process.env.SIGNED_URL_EXPIRY_SECONDS || '3600', 10),
      rateLimitKbps: parseInt(process.env.DOWNLOAD_RATE_LIMIT_KBPS || '10240', 10),
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  };

  return configSchema.parse(config);
}
