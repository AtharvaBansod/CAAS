import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3004),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  mongodb: z.object({
    uri: z.string(),
    dbName: z.string().default('caas_platform'),
  }),
  kafka: z.object({
    brokers: z.array(z.string()),
    clientId: z.string().default('messaging-service'),
  }),
  jwt: z.object({
    publicKey: z.string(),
  }),
  rateLimit: z.object({
    messagesPerMinute: z.number().default(60),
  }),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const config = {
    port: parseInt(process.env.PORT || '3004', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB_NAME || 'caas_platform',
    },
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: process.env.KAFKA_CLIENT_ID || 'messaging-service',
    },
    jwt: {
      publicKey: process.env.JWT_PUBLIC_KEY || '',
    },
    rateLimit: {
      messagesPerMinute: parseInt(process.env.RATE_LIMIT_MESSAGES_PER_MINUTE || '60', 10),
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
    },
  };

  return configSchema.parse(config);
}
