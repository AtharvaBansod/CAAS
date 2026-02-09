import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('UnreadCounter');

export class UnreadCounter {
  private readonly keyPrefix = 'unread';

  constructor(private redis: RedisClientType) {}

  private getUserKey(userId: string): string {
    return `${this.keyPrefix}:${userId}`;
  }

  async incrementUnread(userId: string, conversationId: string): Promise<number> {
    try {
      const key = this.getUserKey(userId);
      const count = await this.redis.hIncrBy(key, conversationId, 1);
      await this.redis.expire(key, 86400 * 30); // 30 days TTL

      logger.debug(`Incremented unread for user ${userId} in conversation ${conversationId} to ${count}`);
      return count;
    } catch (error: any) {
      logger.error('Failed to increment unread count', error);
      return 0;
    }
  }

  async resetUnread(userId: string, conversationId: string): Promise<void> {
    try {
      const key = this.getUserKey(userId);
      await this.redis.hDel(key, conversationId);

      logger.debug(`Reset unread for user ${userId} in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to reset unread count', error);
    }
  }

  async getUnreadCount(userId: string, conversationId: string): Promise<number> {
    try {
      const key = this.getUserKey(userId);
      const count = await this.redis.hGet(key, conversationId);

      return count ? parseInt(count, 10) : 0;
    } catch (error: any) {
      logger.error('Failed to get unread count', error);
      return 0;
    }
  }

  async getTotalUnread(userId: string): Promise<number> {
    try {
      const key = this.getUserKey(userId);
      const counts = await this.redis.hGetAll(key);

      if (!counts || Object.keys(counts).length === 0) {
        return 0;
      }

      let total = 0;
      for (const count of Object.values(counts)) {
        total += parseInt(count, 10);
      }

      return total;
    } catch (error: any) {
      logger.error('Failed to get total unread count', error);
      return 0;
    }
  }

  async getAllUnreadCounts(userId: string): Promise<Map<string, number>> {
    try {
      const key = this.getUserKey(userId);
      const counts = await this.redis.hGetAll(key);

      const result = new Map<string, number>();
      if (counts) {
        for (const [conversationId, count] of Object.entries(counts)) {
          result.set(conversationId, parseInt(count, 10));
        }
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to get all unread counts', error);
      return new Map();
    }
  }

  async setUnreadCount(userId: string, conversationId: string, count: number): Promise<void> {
    try {
      const key = this.getUserKey(userId);
      
      if (count === 0) {
        await this.redis.hDel(key, conversationId);
      } else {
        await this.redis.hSet(key, conversationId, count.toString());
        await this.redis.expire(key, 86400 * 30); // 30 days TTL
      }

      logger.debug(`Set unread count for user ${userId} in conversation ${conversationId} to ${count}`);
    } catch (error: any) {
      logger.error('Failed to set unread count', error);
    }
  }
}
