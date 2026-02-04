import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment Variable Schema
 * Validates all required environment variables for MongoDB service
 */
const envSchema = z.object({
  // MongoDB Connection
  MONGODB_URI: z.string().url('MongoDB URI must be a valid URL'),
  MONGODB_DATABASE: z.string().min(1, 'Database name is required'),

  // Connection Pool Settings
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(1).default(10),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(10).default(100),
  MONGODB_MAX_IDLE_TIME_MS: z.coerce.number().int().positive().default(30000),
  MONGODB_WAIT_QUEUE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // Timeout Settings
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  MONGODB_SOCKET_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MONGODB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  // Retry Settings
  MONGODB_RETRY_WRITES: z.coerce.boolean().default(true),
  MONGODB_RETRY_READS: z.coerce.boolean().default(true),
  MONGODB_MAX_RETRY_TIME_MS: z.coerce.number().int().positive().default(30000),

  // Application Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

/**
 * Validated Environment Variables
 */
export type Environment = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws if validation fails
 */
export function validateEnvironment(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Cached after first call
 */
let cachedEnv: Environment | null = null;

export function getEnvironment(): Environment {
  if (!cachedEnv) {
    cachedEnv = validateEnvironment();
  }
  return cachedEnv;
}
