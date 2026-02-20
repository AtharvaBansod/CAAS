import Redis from 'ioredis';
import { config } from '../config/config';

class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      this.client = new Redis(config.redis.url, {
        keyPrefix: config.redis.keyPrefix,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.client.on('error', (error) => {
        console.error('Redis error:', error);
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
      });

      await this.client.ping();
    } catch (error) {
      console.error('Redis connection error:', error);
      throw error;
    }
  }

  public getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('Redis disconnected');
    }
  }

  public async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const redisConnection = RedisConnection.getInstance();
