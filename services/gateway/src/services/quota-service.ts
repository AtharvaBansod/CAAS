import { createRedisClient } from '../plugins/redis';
import Redis from 'ioredis';

export class QuotaService {
  private redis: Redis;
  
  constructor() {
    this.redis = createRedisClient();
  }

  private getQuotaKey(tenantId: string): string {
    const date = new Date();
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    return `quota:${tenantId}:${monthKey}`;
  }

  async checkQuota(tenantId: string, limit: number): Promise<boolean> {
    if (limit < 0) return true; // Unlimited
    
    const key = this.getQuotaKey(tenantId);
    try {
      const usage = await this.redis.get(key);
      const current = usage ? parseInt(usage, 10) : 0;
      return current < limit;
    } catch (err) {
      console.error('Quota check failed', err);
      return true; // Fail open
    }
  }

  async incrementUsage(tenantId: string, amount = 1): Promise<void> {
    const key = this.getQuotaKey(tenantId);
    try {
      const multi = this.redis.multi();
      multi.incrby(key, amount);
      multi.expire(key, 35 * 24 * 60 * 60); // Expire after ~35 days
      await multi.exec();
    } catch (err) {
      console.error('Quota increment failed', err);
    }
  }

  async getUsage(tenantId: string): Promise<number> {
    const key = this.getQuotaKey(tenantId);
    try {
      const usage = await this.redis.get(key);
      return usage ? parseInt(usage, 10) : 0;
    } catch (err) {
      return 0;
    }
  }
}

export const quotaService = new QuotaService();
