import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';
import { DeliveryTracker } from './delivery-tracker';

const logger = getLogger('DeliveryReceiptHandler');

export interface DeliveryReceipt {
  message_id: string;
  conversation_id: string;
  delivered_to: string;
  delivered_at: Date;
}

export class DeliveryReceiptHandler {
  private deliveryTracker: DeliveryTracker;

  constructor(
    private io: Server,
    redisClient: RedisClientType
  ) {
    this.deliveryTracker = new DeliveryTracker(redisClient);
  }

  /**
   * Mark a message as delivered to a user
   */
  async markAsDelivered(
    userId: string,
    messageId: string,
    conversationId: string
  ): Promise<DeliveryReceipt> {
    await this.deliveryTracker.confirmDelivery(messageId, userId);

    const receipt: DeliveryReceipt = {
      message_id: messageId,
      conversation_id: conversationId,
      delivered_to: userId,
      delivered_at: new Date(),
    };

    logger.debug(`Message ${messageId} delivered to ${userId}`);
    return receipt;
  }

  /**
   * Mark multiple messages as delivered (batch)
   */
  async markBatchAsDelivered(
    userId: string,
    messageIds: string[],
    conversationId: string
  ): Promise<DeliveryReceipt[]> {
    const receipts: DeliveryReceipt[] = [];

    for (const messageId of messageIds) {
      const receipt = await this.markAsDelivered(userId, messageId, conversationId);
      receipts.push(receipt);
    }

    logger.debug(`Batch delivered ${messageIds.length} messages to ${userId}`);
    return receipts;
  }

  /**
   * Broadcast delivery receipt to message sender
   */
  broadcastDeliveryReceipt(
    conversationId: string,
    tenantId: string,
    receipt: DeliveryReceipt,
    senderId: string
  ): void {
    const roomName = `tenant:${tenantId}:conversation:${conversationId}`;
    
    // Send to sender's sockets only
    this.io.of('/chat').to(roomName).emit('delivery_receipt', receipt);
    
    logger.debug(`Broadcast delivery receipt for message ${receipt.message_id} to room ${roomName}`);
  }

  /**
   * Get delivery status for a message
   */
  async getDeliveryStatus(messageId: string): Promise<{
    total_recipients: number;
    delivered_to: string[];
    pending: string[];
  } | null> {
    return await this.deliveryTracker.getDeliveryStatus(messageId);
  }

  /**
   * Track a new message for delivery
   */
  async trackNewMessage(
    messageId: string,
    conversationId: string,
    senderId: string,
    recipientIds: string[]
  ): Promise<void> {
    await this.deliveryTracker.trackMessageSent(
      messageId,
      conversationId,
      senderId,
      recipientIds
    );
  }
}
