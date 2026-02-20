/**
 * Redis Connection Manager - Singleton
 */

import Redis from 'ioredis';
import { config } from '../config/config';
import pino from 'pino';

const logger = pino({ level: config.logLevel });

class RedisConnectionSingleton {
  private static instance: RedisConnectionSingleton;
  private client: Redis | null = null;

  private constructor() {}

  static getInstance(): RedisConnectionSingleton {
    if (!RedisConnectionSingleton.instance) {
      RedisConnectionSingleton.instance = new RedisConnectionSingleton();
    }
    return RedisConnectionSingleton.instance;
  }

  async connect(): Promise<void> {
    if (this.client) {
      logger.info('Redis already connected');
      return;
    }

    try {
      this.client = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('error', (error) => {
        logger.error({ error }, 'Redis connection error');
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      await this.client.ping();
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Redis');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis disconnected');
    }
  }

  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }
}

export const RedisConnection = RedisConnectionSingleton.getInstance();
export { RedisConnectionSingleton };
