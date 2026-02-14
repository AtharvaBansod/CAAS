import { Redis } from 'ioredis';
import axios from 'axios';
import { Logger } from 'pino';

interface PreKeyBundle {
  userId: string;
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
  timestamp: number;
}

interface PreKeyBundleManagerConfig {
  redis: Redis;
  cryptoServiceUrl: string;
  cacheTTL: number;
  rateLimitPerMinute: number;
  logger: Logger;
}

export class PreKeyBundleManager {
  private redis: Redis;
  private cryptoServiceUrl: string;
  private cacheTTL: number;
  private rateLimitPerMinute: number;
  private logger: Logger;

  constructor(config: PreKeyBundleManagerConfig) {
    this.redis = config.redis;
    this.cryptoServiceUrl = config.cryptoServiceUrl;
    this.cacheTTL = config.cacheTTL;
    this.rateLimitPerMinute = config.rateLimitPerMinute;
    this.logger = config.logger;
  }

  /**
   * Request pre-key bundle for a target user
   */
  async requestBundle(requesterId: string, targetUserId: string): Promise<PreKeyBundle | null> {
    // Check rate limit
    const rateLimitKey = `prekey:ratelimit:${requesterId}`;
    const requests = await this.redis.incr(rateLimitKey);
    
    if (requests === 1) {
      await this.redis.expire(rateLimitKey, 60);
    }
    
    if (requests > this.rateLimitPerMinute) {
      this.logger.warn({ requesterId, targetUserId }, 'Pre-key bundle request rate limit exceeded');
      throw new Error('Rate limit exceeded for pre-key bundle requests');
    }

    // Check cache first
    const cacheKey = `prekey:bundle:${targetUserId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      this.logger.debug({ targetUserId }, 'Pre-key bundle found in cache');
      return JSON.parse(cached);
    }

    // Fetch from crypto service
    try {
      const response = await axios.get<PreKeyBundle>(
        `${this.cryptoServiceUrl}/prekey-bundles/${targetUserId}`,
        { timeout: 5000 }
      );

      const bundle = response.data;

      // Cache the bundle
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(bundle));

      this.logger.info({ targetUserId }, 'Pre-key bundle fetched and cached');
      return bundle;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.logger.warn({ targetUserId }, 'Pre-key bundle not found');
        return null;
      }
      
      this.logger.error({ error, targetUserId }, 'Failed to fetch pre-key bundle');
      throw error;
    }
  }

  /**
   * Publish user's pre-key bundle
   */
  async publishBundle(userId: string, bundle: Omit<PreKeyBundle, 'userId' | 'timestamp'>): Promise<void> {
    try {
      await axios.post(
        `${this.cryptoServiceUrl}/prekey-bundles`,
        { userId, ...bundle },
        { timeout: 5000 }
      );

      // Invalidate cache
      const cacheKey = `prekey:bundle:${userId}`;
      await this.redis.del(cacheKey);

      this.logger.info({ userId }, 'Pre-key bundle published');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to publish pre-key bundle');
      throw error;
    }
  }

  /**
   * Remove used one-time pre-key
   */
  async removeUsedPreKey(userId: string, bundleId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.cryptoServiceUrl}/prekey-bundles/${bundleId}`,
        { timeout: 5000 }
      );

      // Invalidate cache to force refresh
      const cacheKey = `prekey:bundle:${userId}`;
      await this.redis.del(cacheKey);

      this.logger.info({ userId, bundleId }, 'One-time pre-key removed');
    } catch (error) {
      this.logger.error({ error, userId, bundleId }, 'Failed to remove pre-key');
      throw error;
    }
  }

  /**
   * Check if bundle needs rotation (low on one-time keys)
   */
  async checkBundleRotation(userId: string): Promise<boolean> {
    const bundle = await this.requestBundle(userId, userId);
    
    if (!bundle) {
      return true; // No bundle exists, needs creation
    }

    // Rotate if less than 10 one-time keys remaining
    return bundle.oneTimePreKeys.length < 10;
  }

  /**
   * Clear cache for user
   */
  async clearCache(userId: string): Promise<void> {
    const cacheKey = `prekey:bundle:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug({ userId }, 'Pre-key bundle cache cleared');
  }
}
