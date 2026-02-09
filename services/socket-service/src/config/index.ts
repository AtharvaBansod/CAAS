import { z } from 'zod';
import dotenv from 'dotenv';
import { defaultJWTConfig, JWTConfig } from '../tokens/jwt-config';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  SOCKET_PATH: z.string().default('/socket.io'),
  SOCKET_PING_INTERVAL: z.string().transform(Number).default('25000'),
  SOCKET_PING_TIMEOUT: z.string().transform(Number).default('20000'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('*'),
  JWT_ALGORITHM: z.enum(['RS256', 'ES256']).default('RS256'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().transform(Number).default('900'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().transform(Number).default('604800'),
  JWT_SERVICE_TOKEN_EXPIRY: z.string().transform(Number).default('3600'),
  JWT_ISSUER: z.string().default('caas.io'),
  JWT_CLOCK_TOLERANCE_SECONDS: z.string().transform(Number).default('30'),
  PRESENCE_IDLE_TIMEOUT_SECONDS: z.string().transform(Number).default('300'),
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  socket: {
    path: env.SOCKET_PATH,
    pingInterval: env.SOCKET_PING_INTERVAL,
    pingTimeout: env.SOCKET_PING_TIMEOUT,
  },
  redis: {
    url: env.REDIS_URL,
  },
  cors: {
    origins: env.CORS_ORIGINS.split(','),
  },
  jwt: {
    algorithm: env.JWT_ALGORITHM,
    accessTokenExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
    refreshTokenExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
    serviceTokenExpiry: env.JWT_SERVICE_TOKEN_EXPIRY,
    issuer: env.JWT_ISSUER,
    clockTolerance: env.JWT_CLOCK_TOLERANCE_SECONDS,
    revocationKeyPrefix: 'jwt:revocation:',
  } as JWTConfig,
  presence: {
    idleTimeoutSeconds: env.PRESENCE_IDLE_TIMEOUT_SECONDS,
  },
};
