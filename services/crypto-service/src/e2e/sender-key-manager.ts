import { Db, Collection } from 'mongodb';
import { Logger } from 'pino';
import { createHmac, randomBytes } from 'crypto';

interface SenderKey {
  userId: string;
  conversationId: string;
  chainKey: string;
  generation: number;
  createdAt: Date;
  expiresAt: Date;
}

export class SenderKeyManager {
  private collection: Collection<SenderKey>;
  private logger: Logger;
  private rotationIntervalHours: number;

  constructor(db: Db, logger: Logger, rotationIntervalHours: number = 168) {
    this.collection = db.collection('sender_keys');
    this.logger = logger;
    this.rotationIntervalHours = rotationIntervalHours;
    this.ensureIndexes();
  }

  private async ensureIndexes(): Promise<void> {
    try {
      await this.collection.createIndex(
        { conversationId: 1, userId: 1 },
        { unique: true, background: true }
      );
      await this.collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0, background: true }
      );
      this.logger.info('Sender key manager indexes created');
    } catch (error) {
      this.logger.error({ error }, 'Failed to create sender key indexes');
    }
  }

  /**
   * Generate new sender key for user in conversation
   */
  async generateSenderKey(userId: string, conversationId: string): Promise<SenderKey> {
    try {
      const chainKey = randomBytes(32).toString('hex');
      const generation = await this.getNextGeneration(conversationId, userId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.rotationIntervalHours * 3600000);

      const senderKey: SenderKey = {
        userId,
        conversationId,
        chainKey,
        generation,
        createdAt: now,
        expiresAt,
      };

      await this.collection.updateOne(
        { conversationId, userId },
        { $set: senderKey },
        { upsert: true }
      );

      this.logger.info({ userId, conversationId, generation }, 'Sender key generated');
      return senderKey;
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to generate sender key');
      throw error;
    }
  }

  /**
   * Get sender key for user in conversation
   */
  async getSenderKey(userId: string, conversationId: string): Promise<SenderKey | null> {
    try {
      const senderKey = await this.collection.findOne({ conversationId, userId });
      
      if (senderKey) {
        this.logger.debug({ userId, conversationId }, 'Sender key retrieved');
      }

      return senderKey;
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to get sender key');
      throw error;
    }
  }

  /**
   * Get all sender keys for a conversation
   */
  async getConversationSenderKeys(conversationId: string): Promise<SenderKey[]> {
    try {
      const keys = await this.collection.find({ conversationId }).toArray();
      this.logger.debug({ conversationId, count: keys.length }, 'Conversation sender keys retrieved');
      return keys;
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to get conversation sender keys');
      throw error;
    }
  }

  /**
   * Store sender key chain
   */
  async storeSenderKeyChain(
    userId: string,
    conversationId: string,
    chainKey: string,
    generation: number
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.rotationIntervalHours * 3600000);

      await this.collection.updateOne(
        { conversationId, userId },
        {
          $set: {
            chainKey,
            generation,
            expiresAt,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );

      this.logger.debug({ userId, conversationId, generation }, 'Sender key chain stored');
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to store sender key chain');
      throw error;
    }
  }

  /**
   * Rotate sender key (generate new key)
   */
  async rotateSenderKey(userId: string, conversationId: string, reason: string): Promise<SenderKey> {
    try {
      this.logger.info({ userId, conversationId, reason }, 'Rotating sender key');

      // Archive old key
      const oldKey = await this.getSenderKey(userId, conversationId);
      if (oldKey) {
        await this.archiveSenderKey(oldKey);
      }

      // Generate new key
      const newKey = await this.generateSenderKey(userId, conversationId);

      this.logger.info({ userId, conversationId, newGeneration: newKey.generation }, 'Sender key rotated');
      return newKey;
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to rotate sender key');
      throw error;
    }
  }

  /**
   * Rotate all sender keys for a conversation (e.g., when member leaves)
   */
  async rotateAllConversationKeys(conversationId: string, reason: string): Promise<SenderKey[]> {
    try {
      this.logger.info({ conversationId, reason }, 'Rotating all conversation sender keys');

      const existingKeys = await this.getConversationSenderKeys(conversationId);
      const newKeys: SenderKey[] = [];

      for (const oldKey of existingKeys) {
        const newKey = await this.rotateSenderKey(oldKey.userId, conversationId, reason);
        newKeys.push(newKey);
      }

      this.logger.info(
        { conversationId, rotatedCount: newKeys.length },
        'All conversation sender keys rotated'
      );

      return newKeys;
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to rotate all conversation keys');
      throw error;
    }
  }

  /**
   * Delete sender key
   */
  async deleteSenderKey(userId: string, conversationId: string): Promise<void> {
    try {
      await this.collection.deleteOne({ conversationId, userId });
      this.logger.info({ userId, conversationId }, 'Sender key deleted');
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to delete sender key');
      throw error;
    }
  }

  /**
   * Delete all sender keys for a conversation
   */
  async deleteConversationKeys(conversationId: string): Promise<number> {
    try {
      const result = await this.collection.deleteMany({ conversationId });
      this.logger.info({ conversationId, deletedCount: result.deletedCount }, 'Conversation sender keys deleted');
      return result.deletedCount;
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to delete conversation keys');
      throw error;
    }
  }

  /**
   * Derive message key from sender key chain
   */
  deriveMessageKey(chainKey: string, messageIndex: number): string {
    const chainKeyBuffer = Buffer.from(chainKey, 'hex');
    const hmac = createHmac('sha256', chainKeyBuffer);
    hmac.update(Buffer.from('sender-message-key', 'utf8'));
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
  advanceChainKey(chainKey: string): string {
    const chainKeyBuffer = Buffer.from(chainKey, 'hex');
    const hmac = createHmac('sha256', chainKeyBuffer);
    hmac.update(Buffer.from([0x02]));
    return hmac.digest().toString('hex');
  }

  /**
   * Check if sender key needs rotation
   */
  async needsRotation(userId: string, conversationId: string): Promise<boolean> {
    try {
      const senderKey = await this.getSenderKey(userId, conversationId);
      
      if (!senderKey) {
        return true; // No key exists, needs creation
      }

      const now = new Date();
      const ageHours = (now.getTime() - senderKey.createdAt.getTime()) / (1000 * 3600);

      return ageHours >= this.rotationIntervalHours;
    } catch (error) {
      this.logger.error({ error, userId, conversationId }, 'Failed to check rotation need');
      return false;
    }
  }

  /**
   * Archive old sender key
   */
  private async archiveSenderKey(senderKey: SenderKey): Promise<void> {
    try {
      const archiveCollection = this.collection.db.collection('sender_keys_archive');
      await archiveCollection.insertOne({
        ...senderKey,
        archivedAt: new Date(),
      });

      this.logger.debug(
        { userId: senderKey.userId, conversationId: senderKey.conversationId },
        'Sender key archived'
      );
    } catch (error) {
      this.logger.error({ error, senderKey }, 'Failed to archive sender key');
      // Don't throw, archival failure shouldn't block rotation
    }
  }

  /**
   * Get next generation number for sender key
   */
  private async getNextGeneration(conversationId: string, userId: string): Promise<number> {
    try {
      const existingKey = await this.getSenderKey(userId, conversationId);
      return existingKey ? existingKey.generation + 1 : 1;
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to get next generation');
      return 1;
    }
  }

  /**
   * Cleanup expired keys (manual trigger)
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await this.collection.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      this.logger.info({ deletedCount: result.deletedCount }, 'Expired sender keys cleaned up');
      return result.deletedCount;
    } catch (error) {
      this.logger.error({ error }, 'Failed to cleanup expired keys');
      throw error;
    }
  }
}
