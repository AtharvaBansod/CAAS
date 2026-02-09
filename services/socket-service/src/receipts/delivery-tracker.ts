import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('DeliveryTracker');

export interface DeliveryTrackingRecord {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  recipient_ids: string[];
  delivered_to: string[];
  sent_at: string;
}

export class DeliveryTracker {
  private readonly DELIVERY_TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private redisClient: RedisClientType,
    private keyPrefix: string = 'delivery'
  ) {}

  /**
   * Track a message sent to recipients
   */
  async trackMessageSent(
    messageId: string,
    conversationId: string,
    senderId: string,
    recipientIds: string[]
  ): Promise<void> {
    const key = `${this.keyPrefix}:${messageId}`;
    
    const record: DeliveryTrackingRecord = {
      message_id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      recipient_ids: recipientIds,
      delivered_to: [],
      sent_at: new Date().toISOString(),
    };

    try {
      await this.redisClient.setEx(
        key,
        this.DELIVERY_TTL,
        JSON.stringify(record)
      );
      logger.debug(`Tracking delivery for message ${messageId} to ${recipientIds.length} recipients`);
    } catch (error: any) {
      logger.error(`Failed to track message ${messageId}: ${error.message}`);
    }
  }

  /**
   * Confirm delivery to a recipient
   */
  async confirmDelivery(messageId: string, recipientId: string): Promise<void> {
    const key = `${this.keyPrefix}:${messageId}`;

    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        logger.warn(`No tracking record found for message ${messageId}`);
        return;
      }

      const record: DeliveryTrackingRecord = JSON.parse(data);
      
      // Add to delivered_to if not already there
      if (!record.delivered_to.includes(recipientId)) {
        record.delivered_to.push(recipientId);
        
        await this.redisClient.setEx(
          key,
          this.DELIVERY_TTL,
          JSON.stringify(record)
        );
        
        logger.debug(`Confirmed delivery of message ${messageId} to ${recipientId}`);
      }
    } catch (error: any) {
      logger.error(`Failed to confirm delivery for message ${messageId}: ${error.message}`);
    }
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageId: string): Promise<{
    total_recipients: number;
    delivered_to: string[];
    pending: string[];
  } | null> {
    const key = `${this.keyPrefix}:${messageId}`;

    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        return null;
      }

      const record: DeliveryTrackingRecord = JSON.parse(data);
      const pending = record.recipient_ids.filter(
        (id) => !record.delivered_to.includes(id)
      );

      return {
        total_recipients: record.recipient_ids.length,
        delivered_to: record.delivered_to,
        pending,
      };
    } catch (error: any) {
      logger.error(`Failed to get delivery status for message ${messageId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get pending deliveries for a user (messages they haven't received yet)
   */
  async getPendingDeliveries(userId: string): Promise<string[]> {
    // This would require a secondary index in production
    // For now, we'll return empty array as this is typically handled
    // by the client requesting missed messages on reconnect
    return [];
  }

  /**
   * Check if message was delivered to a specific user
   */
  async wasDeliveredTo(messageId: string, userId: string): Promise<boolean> {
    const status = await this.getDeliveryStatus(messageId);
    if (!status) return false;
    return status.delivered_to.includes(userId);
  }
}
