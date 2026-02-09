import { RedisClientType } from 'redis';
import { SlidingWindowRateLimiter, RateLimitResult } from './sliding-window';
import { getLogger } from '../utils/logger';

const logger = getLogger('RoomRateLimiter');

export interface RateLimitConfig {
  roomJoinPerMinute: number;
  messagePerMinutePerRoom: number;
  messagePerMinutePerUser: number;
  broadcastPerSecondPerRoom: number;
  typingPerSecondPerUser: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  roomJoinPerMinute: 20,
  messagePerMinutePerRoom: 100,
  messagePerMinutePerUser: 60,
  broadcastPerSecondPerRoom: 10,
  typingPerSecondPerUser: 5,
};

/**
 * Room-specific rate limiter for socket operations
 */
export class RoomRateLimiter {
  private limiter: SlidingWindowRateLimiter;
  private config: RateLimitConfig;

  constructor(
    redisClient: RedisClientType,
    config: Partial<RateLimitConfig> = {}
  ) {
    this.limiter = new SlidingWindowRateLimiter(redisClient, 'room:ratelimit');
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user can join a room
   */
  async checkJoinLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `join:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.roomJoinPerMinute,
      60 * 1000 // 1 minute
    );
  }

  /**
   * Check if user can send a message to a room
   */
  async checkMessageLimit(
    userId: string,
    roomId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    // Check per-user limit
    const userKey = `message:user:${tenantId}:${userId}`;
    const userLimit = await this.limiter.checkLimit(
      userKey,
      this.config.messagePerMinutePerUser,
      60 * 1000
    );

    if (!userLimit.allowed) {
      logger.warn(
        `User ${userId} exceeded message rate limit: ${this.config.messagePerMinutePerUser}/min`
      );
      return userLimit;
    }

    // Check per-room limit
    const roomKey = `message:room:${tenantId}:${roomId}`;
    const roomLimit = await this.limiter.checkLimit(
      roomKey,
      this.config.messagePerMinutePerRoom,
      60 * 1000
    );

    if (!roomLimit.allowed) {
      logger.warn(
        `Room ${roomId} exceeded message rate limit: ${this.config.messagePerMinutePerRoom}/min`
      );
      return roomLimit;
    }

    // Return the more restrictive limit
    return {
      allowed: true,
      remaining: Math.min(userLimit.remaining, roomLimit.remaining),
      reset_at:
        userLimit.reset_at > roomLimit.reset_at
          ? userLimit.reset_at
          : roomLimit.reset_at,
    };
  }

  /**
   * Check if a broadcast can be sent to a room
   */
  async checkBroadcastLimit(
    roomId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `broadcast:room:${tenantId}:${roomId}`;
    return this.limiter.checkLimit(
      key,
      this.config.broadcastPerSecondPerRoom,
      1000 // 1 second
    );
  }

  /**
   * Check if user can send typing indicator
   */
  async checkTypingLimit(
    userId: string,
    tenantId: string
  ): Promise<RateLimitResult> {
    const key = `typing:user:${tenantId}:${userId}`;
    return this.limiter.checkLimit(
      key,
      this.config.typingPerSecondPerUser,
      1000 // 1 second
    );
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Rate limit configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Reset all limits for a user
   */
  async resetUserLimits(userId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.limiter.reset(`join:user:${tenantId}:${userId}`),
      this.limiter.reset(`message:user:${tenantId}:${userId}`),
      this.limiter.reset(`typing:user:${tenantId}:${userId}`),
    ]);
    logger.info(`Reset rate limits for user ${userId} in tenant ${tenantId}`);
  }

  /**
   * Reset all limits for a room
   */
  async resetRoomLimits(roomId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.limiter.reset(`message:room:${tenantId}:${roomId}`),
      this.limiter.reset(`broadcast:room:${tenantId}:${roomId}`),
    ]);
    logger.info(`Reset rate limits for room ${roomId} in tenant ${tenantId}`);
  }
}
