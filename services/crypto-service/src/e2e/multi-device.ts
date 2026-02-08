/**
 * Multi-Device Support
 * Handle encryption to multiple devices
 */

import { keyServer } from '../distribution/key-server';
import { sessionManager } from './session-manager';
import { EncryptedMessage, MultiDeviceMessage } from './types';

export class MultiDeviceService {
  /**
   * Encrypt message to all recipient devices
   */
  async encryptToAllDevices(
    senderId: string,
    recipientId: string,
    plaintext: Buffer
  ): Promise<MultiDeviceMessage> {
    // Get all devices for recipient
    const devices = await keyServer.getUserDevices(recipientId);

    if (devices.length === 0) {
      throw new Error('No devices found for recipient');
    }

    const deviceMessages: Array<{
      device_id: number;
      encrypted_message: EncryptedMessage;
    }> = [];

    // Encrypt to each device
    for (const deviceId of devices) {
      try {
        const encryptedMessage = await this.encryptToDevice(
          senderId,
          recipientId,
          deviceId,
          plaintext
        );

        deviceMessages.push({
          device_id: deviceId,
          encrypted_message: encryptedMessage,
        });
      } catch (error) {
        console.error(
          `Failed to encrypt to device ${deviceId}:`,
          (error as Error).message
        );
        // Continue with other devices
      }
    }

    if (deviceMessages.length === 0) {
      throw new Error('Failed to encrypt to any device');
    }

    return {
      recipient_id: recipientId,
      device_messages: deviceMessages,
    };
  }

  /**
   * Encrypt message to specific device
   */
  private async encryptToDevice(
    senderId: string,
    recipientId: string,
    deviceId: number,
    plaintext: Buffer
  ): Promise<EncryptedMessage> {
    const { sessionCipher } = require('./signal/session-cipher');
    const { messageSerializer } = require('./signal/message-types');

    // Get or create session
    const session = await sessionManager.getOrCreateSession(
      senderId,
      recipientId,
      deviceId
    );

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
      sender_device_id: 1, // Would come from sender's device ID
      registration_id: 0, // Would come from sender's registration ID
      ciphertext: serialized.toString('base64'),
      timestamp: Date.now(),
    };
  }

  /**
   * Handle device add event
   */
  async handleDeviceAdded(
    userId: string,
    recipientId: string,
    newDeviceId: number
  ): Promise<void> {
    // Create session with new device
    await sessionManager.createSession(userId, recipientId, newDeviceId);
  }

  /**
   * Handle device remove event
   */
  async handleDeviceRemoved(
    userId: string,
    recipientId: string,
    removedDeviceId: number
  ): Promise<void> {
    // Delete session with removed device
    await sessionManager.deleteSession(userId, recipientId, removedDeviceId);
  }

  /**
   * Sync sessions across sender devices
   */
  async syncSessions(
    userId: string,
    fromDeviceId: number,
    toDeviceId: number
  ): Promise<number> {
    // Get all sessions from source device
    const sessions = await sessionManager.getUserSessions(userId);

    let syncedCount = 0;

    // In a real implementation, this would:
    // 1. Export session state from source device
    // 2. Encrypt session state
    // 3. Transfer to target device
    // 4. Import session state on target device

    // For now, just count sessions that would be synced
    syncedCount = sessions.length;

    return syncedCount;
  }

  /**
   * Get device count for recipient
   */
  async getDeviceCount(recipientId: string): Promise<number> {
    const devices = await keyServer.getUserDevices(recipientId);
    return devices.length;
  }

  /**
   * Check if recipient has multiple devices
   */
  async hasMultipleDevices(recipientId: string): Promise<boolean> {
    const count = await this.getDeviceCount(recipientId);
    return count > 1;
  }

  /**
   * Get active devices for recipient
   */
  async getActiveDevices(recipientId: string): Promise<number[]> {
    return keyServer.getUserDevices(recipientId);
  }
}

export const multiDeviceService = new MultiDeviceService();
