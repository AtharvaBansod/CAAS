/**
 * Key Change Notification
 * Notifies contacts when identity keys change
 */

import { KeyChangeNotification } from './types';

export class KeyChangeNotificationService {
  private notifications: KeyChangeNotification[] = [];

  /**
   * Create key change notification
   */
  async notifyKeyChange(
    userId: string,
    deviceId: number,
    oldIdentityKey: Buffer,
    newIdentityKey: Buffer,
    contacts: string[]
  ): Promise<void> {
    const notification: KeyChangeNotification = {
      user_id: userId,
      device_id: deviceId,
      old_identity_key: oldIdentityKey,
      new_identity_key: newIdentityKey,
      timestamp: new Date(),
      contacts,
    };

    this.notifications.push(notification);

    // In production, send notifications via Kafka/WebSocket
    await this.sendNotifications(notification);
  }

  /**
   * Send notifications to contacts
   */
  private async sendNotifications(
    notification: KeyChangeNotification
  ): Promise<void> {
    // TODO: Integrate with Kafka service to publish events
    // TODO: Integrate with WebSocket service for real-time notifications
    
    for (const contactId of notification.contacts) {
      console.log(`Notifying ${contactId} of key change for ${notification.user_id}`);
      // await kafkaProducer.send({
      //   topic: 'key-changes',
      //   messages: [{
      //     key: contactId,
      //     value: JSON.stringify(notification)
      //   }]
      // });
    }
  }

  /**
   * Get pending notifications for user
   */
  async getPendingNotifications(userId: string): Promise<KeyChangeNotification[]> {
    return this.notifications.filter(n => 
      n.contacts.includes(userId)
    );
  }

  /**
   * Mark notification as acknowledged
   */
  async acknowledgeNotification(
    userId: string,
    notificationUserId: string,
    timestamp: Date
  ): Promise<void> {
    // Remove user from notification contacts
    const notification = this.notifications.find(
      n => n.user_id === notificationUserId && 
           n.timestamp.getTime() === timestamp.getTime()
    );

    if (notification) {
      notification.contacts = notification.contacts.filter(
        id => id !== userId
      );

      // Remove notification if no more contacts
      if (notification.contacts.length === 0) {
        this.notifications = this.notifications.filter(
          n => n !== notification
        );
      }
    }
  }

  /**
   * Generate safety number for verification
   */
  async generateSafetyNumber(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): Promise<string> {
    const { sha256 } = require('@noble/hashes/sha256');

    // Ensure consistent ordering
    const [firstId, firstKey, secondId, secondKey] = 
      user1Id < user2Id
        ? [user1Id, user1IdentityKey, user2Id, user2IdentityKey]
        : [user2Id, user2IdentityKey, user1Id, user1IdentityKey];

    // Concatenate: version + id1 + key1 + id2 + key2
    const data = Buffer.concat([
      Buffer.from([0x00]), // version
      Buffer.from(firstId),
      firstKey,
      Buffer.from(secondId),
      secondKey,
    ]);

    // Hash
    const hash = sha256(data);

    // Convert to 60 digits
    return this.hashToDigits(Buffer.from(hash));
  }

  /**
   * Convert hash to 60-digit safety number
   */
  private hashToDigits(hash: Buffer): string {
    const digits: string[] = [];
    
    for (let i = 0; i < 60; i += 5) {
      // Take 5 bytes and convert to number
      const offset = Math.floor((i / 5) * 5) % hash.length;
      const chunk = hash.subarray(offset, offset + 5);
      
      let num = 0;
      for (let j = 0; j < chunk.length; j++) {
        num = num * 256 + chunk[j];
      }
      
      // Convert to 5 digits
      const fiveDigits = (num % 100000).toString().padStart(5, '0');
      digits.push(fiveDigits);
    }

    return digits.join(' ');
  }

  /**
   * Verify safety number matches
   */
  async verifySafetyNumber(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer,
    expectedSafetyNumber: string
  ): Promise<boolean> {
    const generated = await this.generateSafetyNumber(
      user1Id,
      user1IdentityKey,
      user2Id,
      user2IdentityKey
    );

    return generated === expectedSafetyNumber;
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<KeyChangeNotification[]> {
    return this.notifications
      .filter(n => n.user_id === userId)
      .slice(-limit);
  }

  /**
   * Clear old notifications
   */
  async clearOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const before = this.notifications.length;
    this.notifications = this.notifications.filter(
      n => n.timestamp > cutoff
    );

    return before - this.notifications.length;
  }
}

export const keyChangeNotificationService = new KeyChangeNotificationService();
