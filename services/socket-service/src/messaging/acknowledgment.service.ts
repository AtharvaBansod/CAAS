/**
 * Acknowledgment Service
 * Handles two-phase acknowledgment system for messages
 */

import { Socket } from 'socket.io';

export interface PendingAck {
  status: 'pending';
  temp_id: string;
  timestamp: string;
}

export interface DeliveredAck {
  status: 'delivered';
  temp_id: string;
  message_id: string;
  timestamp: string;
}

export interface RejectedAck {
  status: 'rejected';
  temp_id: string;
  reason: 'blocked_user' | 'invalid_conversation' | 'permission_denied' | 'rate_limited' | 'validation_failed';
  message?: string;
  timestamp: string;
}

export type MessageAck = PendingAck | DeliveredAck | RejectedAck;

export class AcknowledgmentService {
  /**
   * Send immediate pending acknowledgment
   */
  sendPendingAck(socket: Socket, tempId: string): void {
    const ack: PendingAck = {
      status: 'pending',
      temp_id: tempId,
      timestamp: new Date().toISOString(),
    };

    socket.emit('message:ack', ack);
  }

  /**
   * Send delivered acknowledgment after successful validation and persistence
   */
  sendDeliveredAck(socket: Socket, tempId: string, messageId: string): void {
    const ack: DeliveredAck = {
      status: 'delivered',
      temp_id: tempId,
      message_id: messageId,
      timestamp: new Date().toISOString(),
    };

    socket.emit('message:ack', ack);
  }

  /**
   * Send rejected acknowledgment if validation fails
   */
  sendRejectedAck(
    socket: Socket,
    tempId: string,
    reason: RejectedAck['reason'],
    message?: string
  ): void {
    const ack: RejectedAck = {
      status: 'rejected',
      temp_id: tempId,
      reason,
      message,
      timestamp: new Date().toISOString(),
    };

    socket.emit('message:ack', ack);
  }

  /**
   * Broadcast delivered status to conversation participants
   */
  broadcastDelivered(
    io: any,
    conversationId: string,
    tenantId: string,
    messageId: string,
    senderId: string
  ): void {
    const roomName = `tenant:${tenantId}:conversation:${conversationId}`;
    
    io.to(roomName).emit('message:delivered', {
      message_id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      timestamp: new Date().toISOString(),
    });
  }
}
