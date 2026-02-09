import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('TypingStateStore');

export interface TypingUser {
  user_id: string;
  display_name: string;
  started_at: Date;
}

export class TypingStateStore {
  private readonly keyPrefix = 'typing';
  private readonly ttlSeconds = 10; // 10 seconds TTL

  constructor(private redis: RedisClientType) {}

  private getKey(conversationId: string): string {
    return `${this.keyPrefix}:conversation:${conversationId}`;
  }

  async addTypingUser(conversationId: string, user: TypingUser): Promise<void> {
    try {
      const key = this.getKey(conversationId);
      const value = JSON.stringify({
        user_id: user.user_id,
        display_name: user.display_name,
        started_at: user.started_at.toISOString(),
      });

      await this.redis.hSet(key, user.user_id, value);
      await this.redis.expire(key, this.ttlSeconds);

      logger.debug(`User ${user.user_id} started typing in ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to add typing user', error);
    }
  }

  async removeTypingUser(conversationId: string, userId: string): Promise<void> {
    try {
      const key = this.getKey(conversationId);
      await this.redis.hDel(key, userId);

      logger.debug(`User ${userId} stopped typing in ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to remove typing user', error);
    }
  }

  async getTypingUsers(conversationId: string): Promise<TypingUser[]> {
    try {
      const key = this.getKey(conversationId);
      const data = await this.redis.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return [];
      }

      const users: TypingUser[] = [];
      for (const [userId, value] of Object.entries(data)) {
        try {
          const parsed = JSON.parse(value);
          users.push({
            user_id: parsed.user_id,
            display_name: parsed.display_name,
            started_at: new Date(parsed.started_at),
          });
        } catch (e) {
          logger.warn(`Failed to parse typing user data for ${userId}`);
        }
      }

      return users;
    } catch (error: any) {
      logger.error('Failed to get typing users', error);
      return [];
    }
  }

  async isUserTyping(conversationId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getKey(conversationId);
      const exists = await this.redis.hExists(key, userId);
      return exists;
    } catch (error: any) {
      logger.error('Failed to check if user is typing', error);
      return false;
    }
  }

  async clearConversationTyping(conversationId: string): Promise<void> {
    try {
      const key = this.getKey(conversationId);
      await this.redis.del(key);
      logger.debug(`Cleared all typing for conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to clear conversation typing', error);
    }
  }

  async clearUserTyping(userId: string): Promise<void> {
    try {
      // Find all conversations where user is typing
      const pattern = `${this.keyPrefix}:conversation:*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        await this.redis.hDel(key, userId);
      }

      logger.debug(`Cleared all typing for user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to clear user typing', error);
    }
  }
}
