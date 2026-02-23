import { RedisClientType } from 'redis';
import { SlidingWindowRateLimiter, RateLimitResult } from './sliding-window';
import { getLogger } from '../utils/logger';

const logger = getLogger('MediaRateLimiter');

export interface MediaRateLimitConfig {
  uploadPerMinute: number;
  downloadPerMinute: number;
  deletePerMinute: number;
  metadataPerMinute: number;
}

const DEFAULT_CONFIG: MediaRateLimitConfig = {
  uploadPerMinute: 10,
  downloadPerMinute: 100,
  deletePerMinute: 20,
  metadataPerMinute: 50,
};

/**
 * Rate limiter for media operations
 */
export class MediaRateLimiter {
  private limiter: SlidingWindowRateLimiter;
  private config: MediaRateLimitConfig;

  constructor(
    redisClient: RedisClientType,
    config: Partial<MediaRateLimitConfig> = {}
  ) {
    this.limiter = new SlidingWindowRateLimiter(redisClient, 'media:ratelimit');
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user can request upload URL
   */
  async checkUploadLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `upload:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.uploadPerMinute,
      60 * 1000 // 1 minute
    );
  }

  /**
   * Check if user can download a file
   */
  async checkDownloadLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `download:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.downloadPerMinute,
      60 * 1000
    );
  }

  /**
   * Check if user can delete a file
   */
  async checkDeleteLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `delete:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.deletePerMinute,
      60 * 1000
    );
  }

  /**
   * Check if user can request file metadata
   */
  async checkMetadataLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `metadata:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.metadataPerMinute,
      60 * 1000
    );
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<MediaRateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Media rate limit configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): MediaRateLimitConfig {
    return { ...this.config };
  }

  /**
   * Reset all limits for a user
   */
  async resetUserLimits(userId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.limiter.reset(`upload:user:${tenantId}:${userId}`),
      this.limiter.reset(`download:user:${tenantId}:${userId}`),
      this.limiter.reset(`delete:user:${tenantId}:${userId}`),
      this.limiter.reset(`metadata:user:${tenantId}:${userId}`),
    ]);
    logger.info(`Reset media rate limits for user ${userId} in tenant ${tenantId}`);
  }
}
