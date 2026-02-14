import { Redis } from 'ioredis';
import { MediaRepository } from '../media/media.repository';
import { QuotaCheck } from '../media/media.types';

export class QuotaService {
  private defaultLimit = 1024 * 1024 * 1024; // 1GB default

  constructor(
    private mediaRepo: MediaRepository,
    private redis: Redis
  ) {}

  async checkQuota(tenantId: string, fileSize: number): Promise<QuotaCheck> {
    const usage = await this.getUsage(tenantId);
    const limit = await this.getLimit(tenantId);

    if (usage + fileSize > limit) {
      throw new Error(
        `Storage quota exceeded. Used: ${usage}, Limit: ${limit}, Requested: ${fileSize}`
      );
    }

    return {
      used: usage,
      limit,
      remaining: limit - usage,
    };
  }

  async getUsage(tenantId: string): Promise<number> {
    // Try cache first
    const cached = await this.redis.get(`quota:${tenantId}`);
    if (cached) {
      return parseInt(cached);
    }

    // Calculate from database
    const usage = await this.mediaRepo.getTotalSize(tenantId);
    
    // Cache for 1 hour
    await this.redis.setex(`quota:${tenantId}`, 3600, usage.toString());

    return usage;
  }

  async getLimit(tenantId: string): Promise<number> {
    // TODO: Get from tenant settings
    return this.defaultLimit;
  }

  async updateUsage(tenantId: string, delta: number): Promise<void> {
    await this.redis.incrby(`quota:${tenantId}`, delta);
  }

  async recalculateUsage(tenantId: string): Promise<number> {
    const usage = await this.mediaRepo.getTotalSize(tenantId);
    await this.redis.set(`quota:${tenantId}`, usage.toString());
    return usage;
  }
}
