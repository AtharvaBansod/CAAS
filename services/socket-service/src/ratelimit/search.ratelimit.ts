import { RedisClientType } from 'redis';
import { SlidingWindowRateLimiter, RateLimitResult } from './sliding-window';
import { getLogger } from '../utils/logger';

const logger = getLogger('SearchRateLimiter');

export interface SearchRateLimitConfig {
  searchPerMinute: number;
  complexSearchPerMinute: number;
}

const DEFAULT_CONFIG: SearchRateLimitConfig = {
  searchPerMinute: 30,
  complexSearchPerMinute: 10,
};

/**
 * Rate limiter for search operations
 */
export class SearchRateLimiter {
  private limiter: SlidingWindowRateLimiter;
  private config: SearchRateLimitConfig;

  constructor(
    redisClient: RedisClientType,
    config: Partial<SearchRateLimitConfig> = {}
  ) {
    this.limiter = new SlidingWindowRateLimiter(redisClient, 'search:ratelimit');
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user can perform a search
   */
  async checkSearchLimit(
    userId: string,
    tenantId: string,
    isComplex: boolean = false
  ): Promise<RateLimitResult> {
    const key = `search:user:${tenantId}:${userId}`;
    const limit = isComplex 
      ? this.config.complexSearchPerMinute 
      : this.config.searchPerMinute;
    
    return this.limiter.checkLimit(
      key,
      limit,
      60 * 1000 // 1 minute
    );
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<SearchRateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Search rate limit configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): SearchRateLimitConfig {
    return { ...this.config };
  }

  /**
   * Reset all limits for a user
   */
  async resetUserLimits(userId: string, tenantId: string): Promise<void> {
    await this.limiter.reset(`search:user:${tenantId}:${userId}`);
    logger.info(`Reset search rate limits for user ${userId} in tenant ${tenantId}`);
  }
}
