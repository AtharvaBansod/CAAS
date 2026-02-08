import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  METRICS_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  KAFKA_BROKERS: z.string(),
  JWT_PRIVATE_KEY: z.string().min(1).default(''),
  JWT_PUBLIC_KEY: z.string().min(1).default(''),
  CORS_ORIGINS: z.string().default('*'),
});

export type Config = z.infer<typeof configSchema>;
