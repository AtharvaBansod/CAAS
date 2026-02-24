import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  METRICS_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MONGODB_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  KAFKA_BROKERS: z.string(),
  CORS_ORIGINS: z.string().default('*'),

  // Phase 4.5.z.x: Auth Service integration (replaces JWT_PRIVATE_KEY and JWT_PUBLIC_KEY)
  AUTH_SERVICE_URL: z.string().url().default('http://auth-service:3001'),
  SERVICE_SECRET: z.string().min(1).default('dev-service-secret'),
});

export type Config = z.infer<typeof configSchema>;
