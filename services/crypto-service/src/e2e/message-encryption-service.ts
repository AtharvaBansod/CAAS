/**
 * Message Encryption Service
 * High-level service for E2E encrypted messaging
 */

import { sessionManager } from './session-manager';
import { sessionCipher } from './signal/session-cipher';
import { multiDeviceService } from './multi-device';
import { encryptionModeService } from './encryption-mode';
import { MessageContent, EncryptedMessage, MultiDeviceMessage } from './types';

export class MessageEncryptionService {
  /**
   * Encrypt message for recipient
   */
  async encryptMessage(
    senderId: string,
    senderTenantId: string,
    recipientId: string,
    message: MessageContent
  ): Promise<EncryptedMessage | MultiDeviceMessage> {
    // Check encryption mode
    const mode = await encryptionModeService.getEncryptionMode(senderTenantId);

    if (mode === 'TRANSPORT_ONLY') {
      throw new Error('E2E encryption not enabled for this tenant');
    }

    // Serialize message content
    const plaintext = this.serializeMessageContent(message);

    // Check if recipient has multiple devices
    const hasMultiple = await multiDeviceService.hasMultipleDevices(
      recipientId
    );

    if (hasMultiple) {
      // Encrypt to all devices
      return multiDeviceService.encryptToAllDevices(
        senderId,
        recipientId,
        plaintext
      );
    } else {
      // Encrypt to single device
      return this.encryptToSingleDevice(senderId, recipientId, 1, plaintext);
    }
  }

  /**
   * Decrypt message from sender
   */
  async decryptMessage(
    recipientId: string,
    recipientTenantId: string,
    senderId: string,
    encryptedMessage: EncryptedMessage
  ): Promise<MessageContent> {
    // Check encryption mode
    const mode = await encryptionModeService.getEncryptionMode(
      recipientTenantId
    );

    if (mode === 'TRANSPORT_ONLY') {
      throw new Error('E2E encryption not enabled for this tenant');
    }

    // Deserialize ciphertext
    const ciphertext = Buffer.from(encryptedMessage.ciphertext, 'base64');

    // Decrypt message
    const plaintext = await sessionCipher.decrypt(
      recipientId,
      senderId,
      encryptedMessage.sender_device_id,
      {
        type: encryptedMessage.type,
        version: 3,
        sender_ratchet_key: Buffer.alloc(32), // Would be extracted from message
        message_number: 0,
        previous_counter: 0,
        ciphertext,
      }
    );

    // Deserialize message content
    return this.deserializeMessageContent(plaintext);
  }

  /**
   * Check if session exists
   */
  async hasSession(
    userId: string,
    recipientId: string
  ): Promise<boolean> {
    const devices = await multiDeviceService.getActiveDevices(recipientId);
    
    if (devices.length === 0) {
      return false;
    }

    // Check if session exists with at least one device
    for (const deviceId of devices) {
      const hasSession = await sessionManager.hasSession(
        userId,
        recipientId,
        deviceId
      );
      if (hasSession) {
        return true;
      }
    }

    return false;
  }

  /**
   * Encrypt to single device
   */
  private async encryptToSingleDevice(
    senderId: string,
    recipientId: string,
    deviceId: number,
    plaintext: Buffer
  ): Promise<EncryptedMessage> {
    const { messageSerializer } = require('./signal/message-types');

    // Get or create session
    await sessionManager.getOrCreateSession(senderId, recipientId, deviceId);

    // Encrypt message
    const ciphertextMessage = await sessionCipher.encrypt(
      senderId,
      recipientId,
      deviceId,
      plaintext
    );

    // Serialize
    const serialized =
      messageSerializer.serializeCiphertextMessage(ciphertextMessage);

    return {
      type: ciphertextMessage.type,
      sender_device_id: 1,
      registration_id: 0,
      ciphertext: serialized.toString('base64'),
      timestamp: Date.now(),
    };
  }

  /**
   * Serialize message content
   */
  private serializeMessageContent(message: MessageContent): Buffer {
    const data = {
      type: message.type,
      body: message.body,
      media_key: message.media_key?.toString('base64'),
      thumbnail: message.thumbnail?.toString('base64'),
      metadata: message.metadata,
    };

    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Deserialize message content
   */
  private deserializeMessageContent(data: Buffer): MessageContent {
    const parsed = JSON.parse(data.toString());

    return {
      type: parsed.type,
      body: parsed.body,
      media_key: parsed.media_key
        ? Buffer.from(parsed.media_key, 'base64')
        : undefined,
      thumbnail: parsed.thumbnail
        ? Buffer.from(parsed.thumbnail, 'base64')
        : undefined,
      metadata: parsed.metadata || {},
    };
  }

  /**
   * Get encryption statistics
   */
  async getEncryptionStats(userId: string): Promise<{
    total_sessions: number;
    active_conversations: number;
    encryption_mode: string;
  }> {
    const sessions = await sessionManager.getUserSessions(userId);
    const recipients = new Set(sessions.map(s => s.recipient_id));

    // Get tenant ID (would be fetched from user)
    const tenantId = 'default';
    const mode = await encryptionModeService.getEncryptionMode(tenantId);

    return {
      total_sessions: sessions.length,
      active_conversations: recipients.size,
      encryption_mode: mode,
    };
  }
}

export const messageEncryptionService = new MessageEncryptionService();
