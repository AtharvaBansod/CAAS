import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('LastSeenTracker');

export interface LastSeenRecord {
  user_id: string;
  last_seen: Date;
  device_type?: string;
  updated_at: Date;
}

export class LastSeenTracker {
  private redis: RedisClientType;
  private readonly LAST_SEEN_PREFIX = 'presence:last_seen';
  private readonly REDIS_TTL = 30 * 24 * 60 * 60; // 30 days

  constructor(redis: RedisClientType) {
    this.redis = redis;
  }

  /**
   * Update last seen timestamp for a user
   */
  async updateLastSeen(userId: string, deviceType?: string): Promise<void> {
    try {
      const key = `${this.LAST_SEEN_PREFIX}:${userId}`;
      const timestamp = new Date().toISOString();

      const record: LastSeenRecord = {
        user_id: userId,
        last_seen: new Date(),
        device_type: deviceType,
        updated_at: new Date(),
      };

      await this.redis.set(key, JSON.stringify(record), {
        EX: this.REDIS_TTL,
      });

      logger.debug(`Updated last seen for user ${userId}`);
    } catch (error: any) {
      logger.error('Error updating last seen', error);
    }
  }

  /**
   * Get last seen timestamp for a user
   */
  async getLastSeen(userId: string): Promise<Date | null> {
    try {
      const key = `${this.LAST_SEEN_PREFIX}:${userId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      const record: LastSeenRecord = JSON.parse(data);
      return new Date(record.last_seen);
    } catch (error: any) {
      logger.error('Error getting last seen', error);
      return null;
    }
  }

  /**
   * Get last seen for multiple users
   */
  async getBulkLastSeen(userIds: string[]): Promise<Map<string, Date | null>> {
    try {
      const result = new Map<string, Date | null>();

      // Get all keys
      const keys = userIds.map(id => `${this.LAST_SEEN_PREFIX}:${id}`);
      const values = await this.redis.mGet(keys);

      // Parse results
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const value = values[i];

        if (value) {
          try {
            const record: LastSeenRecord = JSON.parse(value);
            result.set(userId, new Date(record.last_seen));
          } catch {
            result.set(userId, null);
          }
        } else {
          result.set(userId, null);
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Error getting bulk last seen', error);
      return new Map();
    }
  }

  /**
   * Get full last seen record
   */
  async getLastSeenRecord(userId: string): Promise<LastSeenRecord | null> {
    try {
      const key = `${this.LAST_SEEN_PREFIX}:${userId}`;
      const data = await this.redis.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error: any) {
      logger.error('Error getting last seen record', error);
      return null;
    }
  }

  /**
   * Format last seen for display
   */
  formatLastSeen(lastSeen: Date | null): string {
    if (!lastSeen) {
      return 'Never';
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return lastSeen.toLocaleDateString();
    }
  }

  /**
   * Get approximate last seen (for privacy)
   */
  getApproximateLastSeen(lastSeen: Date | null): string {
    if (!lastSeen) {
      return 'Long time ago';
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      return 'Recently';
    } else if (diffHours < 24) {
      return 'Today';
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else if (diffHours < 168) {
      return 'This week';
    } else {
      return 'Long time ago';
    }
  }
}
