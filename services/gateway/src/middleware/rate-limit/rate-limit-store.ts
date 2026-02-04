import Redis from 'ioredis';
import { createRedisClient } from '../../plugins/redis';

export class RateLimitStore {
  private redis: Redis;

  constructor() {
    this.redis = createRedisClient();
  }

  async increment(key: string, window: number): Promise<{ current: number; ttl: number }> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.ttl(key);
    
    const results = await multi.exec();
    
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const [incrErr, currentVal] = results[0];
    const [ttlErr, ttlVal] = results[1];

    if (incrErr || ttlErr) {
      throw incrErr || ttlErr;
    }

    const current = currentVal as number;
    let ttl = ttlVal as number;

    // Set expiration if it's a new key
    if (current === 1) {
      await this.redis.expire(key, window);
      ttl = window;
    }

    return { current, ttl };
  }
}

export const rateLimitStore = new RateLimitStore();
