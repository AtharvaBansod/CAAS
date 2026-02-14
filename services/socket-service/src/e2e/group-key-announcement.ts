import { Logger } from 'pino';
import { GroupEncryption } from './group-encryption';

interface KeyAnnouncementConfig {
  groupEncryption: GroupEncryption;
  logger: Logger;
}

export class GroupKeyAnnouncement {
  private groupEncryption: GroupEncryption;
  private logger: Logger;
  private pendingAnnouncements: Map<string, NodeJS.Timeout>;

  constructor(config: KeyAnnouncementConfig) {
    this.groupEncryption = config.groupEncryption;
    this.logger = config.logger;
    this.pendingAnnouncements = new Map();
  }

  /**
   * Announce key change to group
   */
  async announceKeyChange(
    conversationId: string,
    userId: string,
    reason: 'rotation' | 'member_change' | 'compromise',
    io: any
  ): Promise<void> {
    try {
      this.logger.info({ conversationId, userId, reason }, 'Announcing key change');

      // Cancel any pending announcement for this user/conversation
      const announcementKey = `${conversationId}:${userId}`;
      const pending = this.pendingAnnouncements.get(announcementKey);
      if (pending) {
        clearTimeout(pending);
      }

      // Broadcast key change announcement
      io.to(`conversation:${conversationId}`).emit('e2e:group_key_announcement', {
        conversationId,
        userId,
        reason,
        timestamp: Date.now(),
      });

      this.logger.info({ conversationId, userId, reason }, 'Key change announced');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to announce key change');
      throw error;
    }
  }

  /**
   * Coordinate key rotation across group members
   */
  async coordinateRotation(
    conversationId: string,
    memberIds: string[],
    io: any
  ): Promise<void> {
    try {
      this.logger.info({ conversationId, memberCount: memberIds.length }, 'Coordinating key rotation');

      // Notify all members to prepare for rotation
      io.to(`conversation:${conversationId}`).emit('e2e:group_rotation_prepare', {
        conversationId,
        memberIds,
        timestamp: Date.now(),
      });

      // Generate new sender keys for all members
      const newKeys = [];
      for (const memberId of memberIds) {
        const senderKey = await this.groupEncryption.generateSenderKey(memberId, conversationId);
        newKeys.push(senderKey);
      }

      // Distribute all new keys
      for (const senderKey of newKeys) {
        await this.groupEncryption.distributeSenderKey(senderKey, memberIds, io);
      }

      // Notify rotation complete
      io.to(`conversation:${conversationId}`).emit('e2e:group_rotation_complete', {
        conversationId,
        timestamp: Date.now(),
      });

      this.logger.info({ conversationId, keyCount: newKeys.length }, 'Key rotation coordinated');
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to coordinate rotation');
      throw error;
    }
  }

  /**
   * Handle key conflict resolution
   */
  async resolveKeyConflict(
    conversationId: string,
    userId: string,
    conflictingGenerations: number[],
    io: any
  ): Promise<void> {
    try {
      this.logger.warn(
        { conversationId, userId, conflictingGenerations },
        'Resolving key conflict'
      );

      // Use highest generation number
      const winningGeneration = Math.max(...conflictingGenerations);

      // Generate new key with winning generation + 1
      const senderKey = await this.groupEncryption.generateSenderKey(userId, conversationId);

      // Get all group members
      // Note: In production, fetch from database
      const memberIds: string[] = []; // TODO: Fetch from conversation service

      // Distribute new key
      await this.groupEncryption.distributeSenderKey(senderKey, memberIds, io);

      // Announce conflict resolution
      io.to(`conversation:${conversationId}`).emit('e2e:group_conflict_resolved', {
        conversationId,
        userId,
        winningGeneration,
        newGeneration: senderKey.generation,
        timestamp: Date.now(),
      });

      this.logger.info({ conversationId, userId, newGeneration: senderKey.generation }, 'Key conflict resolved');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to resolve key conflict');
      throw error;
    }
  }

  /**
   * Schedule delayed key announcement (for batching)
   */
  scheduleAnnouncement(
    conversationId: string,
    userId: string,
    reason: 'rotation' | 'member_change' | 'compromise',
    delayMs: number,
    io: any
  ): void {
    const announcementKey = `${conversationId}:${userId}`;

    // Cancel existing scheduled announcement
    const existing = this.pendingAnnouncements.get(announcementKey);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new announcement
    const timeout = setTimeout(() => {
      this.announceKeyChange(conversationId, userId, reason, io);
      this.pendingAnnouncements.delete(announcementKey);
    }, delayMs);

    this.pendingAnnouncements.set(announcementKey, timeout);

    this.logger.debug({ conversationId, userId, delayMs }, 'Key announcement scheduled');
  }

  /**
   * Cancel pending announcement
   */
  cancelAnnouncement(conversationId: string, userId: string): void {
    const announcementKey = `${conversationId}:${userId}`;
    const pending = this.pendingAnnouncements.get(announcementKey);
    
    if (pending) {
      clearTimeout(pending);
      this.pendingAnnouncements.delete(announcementKey);
      this.logger.debug({ conversationId, userId }, 'Key announcement cancelled');
    }
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    for (const timeout of this.pendingAnnouncements.values()) {
      clearTimeout(timeout);
    }
    this.pendingAnnouncements.clear();
    this.logger.info('Group key announcement cleanup complete');
  }
}
