import { Server } from 'socket.io';
import { ReadReceiptStore } from './read-receipt-store';
import { ReadPosition, ReadReceipt } from './read-receipt-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('ReadReceiptHandler');

export class ReadReceiptHandler {
  constructor(
    private io: Server,
    private store: ReadReceiptStore
  ) {}

  async markAsRead(
    userId: string,
    conversationId: string,
    messageId: string,
    tenantId: string
  ): Promise<ReadReceipt> {
    try {
      const now = new Date();

      // Update read position
      const position: ReadPosition = {
        user_id: userId,
        conversation_id: conversationId,
        tenant_id: tenantId,
        last_read_message_id: messageId,
        last_read_at: now,
        updated_at: now,
      };

      await this.store.setReadPosition(position);

      const receipt: ReadReceipt = {
        message_id: messageId,
        conversation_id: conversationId,
        read_by: userId,
        read_at: now,
      };

      logger.debug(`Message ${messageId} marked as read by user ${userId}`);
      return receipt;
    } catch (error: any) {
      logger.error('Failed to mark message as read', error);
      throw error;
    }
  }

  async markBatchAsRead(
    userId: string,
    conversationId: string,
    messageIds: string[],
    tenantId: string
  ): Promise<ReadReceipt[]> {
    try {
      const receipts: ReadReceipt[] = [];
      const now = new Date();

      // For batch, we only update the position to the last message
      if (messageIds.length > 0) {
        const lastMessageId = messageIds[messageIds.length - 1];
        
        const position: ReadPosition = {
          user_id: userId,
          conversation_id: conversationId,
          tenant_id: tenantId,
          last_read_message_id: lastMessageId,
          last_read_at: now,
          updated_at: now,
        };

        await this.store.setReadPosition(position);

        // Create receipts for all messages
        for (const messageId of messageIds) {
          receipts.push({
            message_id: messageId,
            conversation_id: conversationId,
            read_by: userId,
            read_at: now,
          });
        }

        logger.debug(`Batch of ${messageIds.length} messages marked as read by user ${userId}`);
      }

      return receipts;
    } catch (error: any) {
      logger.error('Failed to mark batch as read', error);
      throw error;
    }
  }

  async markConversationAsRead(
    userId: string,
    conversationId: string,
    upToMessageId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const now = new Date();

      const position: ReadPosition = {
        user_id: userId,
        conversation_id: conversationId,
        tenant_id: tenantId,
        last_read_message_id: upToMessageId,
        last_read_at: now,
        updated_at: now,
      };

      await this.store.setReadPosition(position);

      logger.debug(`Conversation ${conversationId} marked as read up to ${upToMessageId} by user ${userId}`);
    } catch (error: any) {
      logger.error('Failed to mark conversation as read', error);
      throw error;
    }
  }

  async getReadPosition(userId: string, conversationId: string): Promise<ReadPosition | null> {
    return this.store.getReadPosition(userId, conversationId);
  }

  async getAllReadPositions(userId: string): Promise<ReadPosition[]> {
    return this.store.getAllReadPositions(userId);
  }

  broadcastReadReceipt(
    conversationId: string,
    tenantId: string,
    receipt: ReadReceipt,
    excludeUserId?: string
  ): void {
    try {
      const roomName = `tenant:${tenantId}:conversation:${conversationId}`;
      
      if (excludeUserId) {
        this.io.to(roomName).except(excludeUserId).emit('read_receipt', receipt);
      } else {
        this.io.to(roomName).emit('read_receipt', receipt);
      }

      logger.debug(`Read receipt broadcast for message ${receipt.message_id} in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to broadcast read receipt', error);
    }
  }
}
