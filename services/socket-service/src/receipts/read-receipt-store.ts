import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';
import { ReadPosition } from './read-receipt-types';

const logger = getLogger('ReadReceiptStore');

export class ReadReceiptStore {
  private readonly keyPrefix = 'read_position';

  constructor(private redis: RedisClientType) {}

  private getKey(userId: string, conversationId: string): string {
    return `${this.keyPrefix}:${userId}:${conversationId}`;
  }

  async setReadPosition(position: ReadPosition): Promise<void> {
    try {
      const key = this.getKey(position.user_id, position.conversation_id);
      const value = JSON.stringify({
        user_id: position.user_id,
        conversation_id: position.conversation_id,
        tenant_id: position.tenant_id,
        last_read_message_id: position.last_read_message_id,
        last_read_at: position.last_read_at.toISOString(),
        updated_at: position.updated_at.toISOString(),
      });

      await this.redis.set(key, value);
      await this.redis.expire(key, 86400 * 30); // 30 days TTL

      logger.debug(`Read position set for user ${position.user_id} in conversation ${position.conversation_id}`);
    } catch (error: any) {
      logger.error('Failed to set read position', error);
    }
  }

  async getReadPosition(userId: string, conversationId: string): Promise<ReadPosition | null> {
    try {
      const key = this.getKey(userId, conversationId);
      const value = await this.redis.get(key);

      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      return {
        user_id: parsed.user_id,
        conversation_id: parsed.conversation_id,
        tenant_id: parsed.tenant_id,
        last_read_message_id: parsed.last_read_message_id,
        last_read_at: new Date(parsed.last_read_at),
        updated_at: new Date(parsed.updated_at),
      };
    } catch (error: any) {
      logger.error('Failed to get read position', error);
      return null;
    }
  }

  async getAllReadPositions(userId: string): Promise<ReadPosition[]> {
    try {
      const pattern = `${this.keyPrefix}:${userId}:*`;
      const keys = await this.redis.keys(pattern);

      const positions: ReadPosition[] = [];
      for (const key of keys) {
        const value = await this.redis.get(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            positions.push({
              user_id: parsed.user_id,
              conversation_id: parsed.conversation_id,
              tenant_id: parsed.tenant_id,
              last_read_message_id: parsed.last_read_message_id,
              last_read_at: new Date(parsed.last_read_at),
              updated_at: new Date(parsed.updated_at),
            });
          } catch (e) {
            logger.warn(`Failed to parse read position for key ${key}`);
          }
        }
      }

      return positions;
    } catch (error: any) {
      logger.error('Failed to get all read positions', error);
      return [];
    }
  }

  async deleteReadPosition(userId: string, conversationId: string): Promise<void> {
    try {
      const key = this.getKey(userId, conversationId);
      await this.redis.del(key);
      logger.debug(`Read position deleted for user ${userId} in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to delete read position', error);
    }
  }
}
