/**
 * Key Change Detector
 * Detects and handles identity key changes
 */

import { verificationStore } from './verification-store';
import { KeyChangeEvent } from './types';

export class KeyChangeDetector {
  private keyChangeEvents: KeyChangeEvent[] = [];

  /**
   * Detect identity key change
   */
  async detectKeyChange(
    userId: string,
    deviceId: number,
    oldIdentityKey: Buffer,
    newIdentityKey: Buffer
  ): Promise<KeyChangeEvent> {
    // Get affected users (would query from database)
    const affectedUsers = await this.getAffectedUsers(userId);

    const event: KeyChangeEvent = {
      user_id: userId,
      device_id: deviceId,
      old_identity_key: oldIdentityKey,
      new_identity_key: newIdentityKey,
      timestamp: new Date(),
      affected_users: affectedUsers,
    };

    this.keyChangeEvents.push(event);

    // Invalidate all verifications
    await this.handleKeyChange(event);

    return event;
  }

  /**
   * Handle key change event
   */
  private async handleKeyChange(event: KeyChangeEvent): Promise<void> {
    // Invalidate all verifications for this user
    await verificationStore.invalidateUserVerifications(event.user_id);

    // Notify affected users
    await this.notifyAffectedUsers(event);
  }

  /**
   * Notify affected users of key change
   */
  private async notifyAffectedUsers(event: KeyChangeEvent): Promise<void> {
    for (const affectedUserId of event.affected_users) {
      // TODO: Send notification via WebSocket/Kafka
      console.log(
        `Notifying ${affectedUserId} of key change for ${event.user_id}`
      );

      // In production:
      // await notificationService.send({
      //   user_id: affectedUserId,
      //   type: 'key_change',
      //   data: {
      //     changed_user_id: event.user_id,
      //     timestamp: event.timestamp,
      //   },
      // });
    }
  }

  /**
   * Get affected users (users who have conversations with this user)
   */
  private async getAffectedUsers(userId: string): Promise<string[]> {
    // In production, would query from database
    // For now, return empty array
    return [];
  }

  /**
   * Get key change events for user
   */
  async getKeyChangeEvents(userId: string): Promise<KeyChangeEvent[]> {
    return this.keyChangeEvents.filter(
      e => e.user_id === userId || e.affected_users.includes(userId)
    );
  }

  /**
   * Get recent key changes
   */
  async getRecentKeyChanges(hours: number = 24): Promise<KeyChangeEvent[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.keyChangeEvents.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Check if user has recent key change
   */
  async hasRecentKeyChange(
    userId: string,
    hours: number = 24
  ): Promise<boolean> {
    const recentChanges = await this.getRecentKeyChanges(hours);
    return recentChanges.some(e => e.user_id === userId);
  }

  /**
   * Acknowledge key change
   */
  async acknowledgeKeyChange(
    userId: string,
    changedUserId: string,
    timestamp: Date
  ): Promise<void> {
    const event = this.keyChangeEvents.find(
      e =>
        e.user_id === changedUserId &&
        e.timestamp.getTime() === timestamp.getTime()
    );

    if (event) {
      // Remove user from affected users
      event.affected_users = event.affected_users.filter(
        id => id !== userId
      );
    }
  }

  /**
   * Cleanup old key change events
   */
  async cleanupOldEvents(daysOld: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const before = this.keyChangeEvents.length;
    this.keyChangeEvents = this.keyChangeEvents.filter(
      e => e.timestamp >= cutoff
    );

    return before - this.keyChangeEvents.length;
  }

  /**
   * Get key change statistics
   */
  async getKeyChangeStats(): Promise<{
    total_changes: number;
    recent_changes_24h: number;
    recent_changes_7d: number;
  }> {
    const changes24h = await this.getRecentKeyChanges(24);
    const changes7d = await this.getRecentKeyChanges(24 * 7);

    return {
      total_changes: this.keyChangeEvents.length,
      recent_changes_24h: changes24h.length,
      recent_changes_7d: changes7d.length,
    };
  }
}

export const keyChangeDetector = new KeyChangeDetector();
