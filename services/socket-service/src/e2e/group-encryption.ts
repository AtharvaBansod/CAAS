import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { randomBytes, createHmac } from 'crypto';

interface SenderKey {
  userId: string;
  conversationId: string;
  chainKey: string;
  generation: number;
  createdAt: number;
}

interface GroupEncryptionConfig {
  redis: Redis;
  logger: Logger;
  rotationIntervalHours: number;
}

export class GroupEncryption {
  private redis: Redis;
  private logger: Logger;
  private rotationIntervalHours: number;

  constructor(config: GroupEncryptionConfig) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.rotationIntervalHours = config.rotationIntervalHours;
  }

  /**
   * Generate sender key for user in group
   */
  async generateSenderKey(userId: string, conversationId: string): Promise<SenderKey> {
    const chainKey = randomBytes(32).toString('hex');
    const generation = await this.getNextGeneration(conversationId, userId);

    const senderKey: SenderKey = {
      userId,
      conversationId,
      chainKey,
      generation,
      createdAt: Date.now(),
    };

    await this.storeSenderKey(senderKey);

    this.logger.info({ userId, conversationId, generation }, 'Sender key generated');
    return senderKey;
  }

  /**
   * Get sender key for user in group
   */
  async getSenderKey(userId: string, conversationId: string): Promise<SenderKey | null> {
    const key = `sender_key:${conversationId}:${userId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  /**
   * Distribute sender key to all group members
   */
  async distributeSenderKey(
    senderKey: SenderKey,
    memberIds: string[],
    io: any
  ): Promise<void> {
    const { userId, conversationId, chainKey, generation } = senderKey;

    try {
      // Send to each member
      for (const memberId of memberIds) {
        if (memberId === userId) continue; // Don't send to self

        io.to(`user:${memberId}`).emit('e2e:group_sender_key_distribute', {
          senderId: userId,
          conversationId,
          chainKey,
          generation,
          timestamp: Date.now(),
        });
      }

      this.logger.info(
        { userId, conversationId, memberCount: memberIds.length },
        'Sender key distributed to group'
      );
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to distribute sender key');
      throw error;
    }
  }

  /**
   * Handle member joining group - distribute all existing sender keys
   */
  async handleMemberJoin(
    conversationId: string,
    newMemberId: string,
    existingMemberIds: string[],
    io: any
  ): Promise<void> {
    try {
      this.logger.info({ conversationId, newMemberId }, 'Handling member join for encryption');

      // Get all existing sender keys
      const senderKeys: SenderKey[] = [];
      for (const memberId of existingMemberIds) {
        const senderKey = await this.getSenderKey(memberId, conversationId);
        if (senderKey) {
          senderKeys.push(senderKey);
        }
      }

      // Send all sender keys to new member
      for (const senderKey of senderKeys) {
        io.to(`user:${newMemberId}`).emit('e2e:group_sender_key_distribute', {
          senderId: senderKey.userId,
          conversationId,
          chainKey: senderKey.chainKey,
          generation: senderKey.generation,
          timestamp: Date.now(),
        });
      }

      // Generate sender key for new member
      const newMemberKey = await this.generateSenderKey(newMemberId, conversationId);

      // Distribute new member's key to all existing members
      await this.distributeSenderKey(newMemberKey, existingMemberIds, io);

      this.logger.info(
        { conversationId, newMemberId, keyCount: senderKeys.length },
        'Member join encryption setup complete'
      );
    } catch (error) {
      this.logger.error({ error, conversationId, newMemberId }, 'Failed to handle member join');
      throw error;
    }
  }

  /**
   * Handle member leaving group - rotate all sender keys
   */
  async handleMemberLeave(
    conversationId: string,
    leavingMemberId: string,
    remainingMemberIds: string[],
    io: any
  ): Promise<void> {
    try {
      this.logger.info({ conversationId, leavingMemberId }, 'Handling member leave - rotating keys');

      // Delete leaving member's sender key
      await this.deleteSenderKey(leavingMemberId, conversationId);

      // Rotate all remaining members' sender keys
      for (const memberId of remainingMemberIds) {
        const newSenderKey = await this.generateSenderKey(memberId, conversationId);
        await this.distributeSenderKey(newSenderKey, remainingMemberIds, io);
      }

      // Notify all members of key update
      io.to(`conversation:${conversationId}`).emit('e2e:group_key_update', {
        conversationId,
        reason: 'member_left',
        leavingMemberId,
        timestamp: Date.now(),
      });

      this.logger.info(
        { conversationId, leavingMemberId, rotatedCount: remainingMemberIds.length },
        'Member leave key rotation complete'
      );
    } catch (error) {
      this.logger.error({ error, conversationId, leavingMemberId }, 'Failed to handle member leave');
      throw error;
    }
  }

  /**
   * Derive message key from sender key chain
   */
  deriveMessageKey(chainKey: string, messageIndex: number): string {
    const chainKeyBuffer = Buffer.from(chainKey, 'hex');
    const hmac = createHmac('sha256', chainKeyBuffer);
    hmac.update(Buffer.from('group-message-key', 'utf8'));
    hmac.update(Buffer.from([
      messageIndex & 0xff,
      (messageIndex >> 8) & 0xff,
      (messageIndex >> 16) & 0xff,
      (messageIndex >> 24) & 0xff,
    ]));
    return hmac.digest().toString('hex');
  }

  /**
   * Advance sender key chain
   */
  async advanceSenderKeyChain(userId: string, conversationId: string): Promise<string> {
    const senderKey = await this.getSenderKey(userId, conversationId);
    if (!senderKey) {
      throw new Error('Sender key not found');
    }

    const chainKeyBuffer = Buffer.from(senderKey.chainKey, 'hex');
    const hmac = createHmac('sha256', chainKeyBuffer);
    hmac.update(Buffer.from([0x02]));
    const newChainKey = hmac.digest().toString('hex');

    // Update stored sender key
    senderKey.chainKey = newChainKey;
    await this.storeSenderKey(senderKey);

    return newChainKey;
  }

  /**
   * Check if sender key needs rotation
   */
  async checkRotation(userId: string, conversationId: string): Promise<boolean> {
    const senderKey = await this.getSenderKey(userId, conversationId);
    if (!senderKey) {
      return true; // No key exists, needs creation
    }

    const ageHours = (Date.now() - senderKey.createdAt) / (1000 * 3600);
    return ageHours >= this.rotationIntervalHours;
  }

  /**
   * Helper methods
   */
  private async storeSenderKey(senderKey: SenderKey): Promise<void> {
    const key = `sender_key:${senderKey.conversationId}:${senderKey.userId}`;
    const ttl = this.rotationIntervalHours * 3600 + 86400; // Add 1 day buffer
    await this.redis.setex(key, ttl, JSON.stringify(senderKey));
  }

  private async deleteSenderKey(userId: string, conversationId: string): Promise<void> {
    const key = `sender_key:${conversationId}:${userId}`;
    await this.redis.del(key);
  }

  private async getNextGeneration(conversationId: string, userId: string): Promise<number> {
    const key = `sender_key_gen:${conversationId}:${userId}`;
    const generation = await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 365); // 1 year
    return generation;
  }
}
