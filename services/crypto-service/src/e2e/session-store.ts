import { Db, Collection } from 'mongodb';
import { Logger } from 'pino';

interface SessionDocument {
  conversationId: string;
  userId: string;
  partnerId: string;
  rootKey: string;
  sendingChainKey: string;
  receivingChainKey: string;
  sendingChainLength: number;
  receivingChainLength: number;
  previousSendingChainLength: number;
  skippedMessageKeys: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class SessionStore {
  private collection: Collection<SessionDocument>;
  private logger: Logger;
  private sessionLifetimeHours: number;

  constructor(db: Db, logger: Logger, sessionLifetimeHours: number = 168) {
    this.collection = db.collection('sessions');
    this.logger = logger;
    this.sessionLifetimeHours = sessionLifetimeHours;
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
      this.logger.info('Session store indexes created');
    } catch (error) {
      this.logger.error({ error }, 'Failed to create session store indexes');
    }
  }

  /**
   * Store session state
   */
  async storeSession(session: Omit<SessionDocument, 'createdAt' | 'updatedAt' | 'expiresAt'>): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.sessionLifetimeHours * 3600000);

      await this.collection.updateOne(
        { conversationId: session.conversationId, userId: session.userId },
        {
          $set: {
            ...session,
            updatedAt: now,
            expiresAt,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true }
      );

      this.logger.debug(
        { conversationId: session.conversationId, userId: session.userId },
        'Session stored'
      );
    } catch (error) {
      this.logger.error({ error, session }, 'Failed to store session');
      throw error;
    }
  }

  /**
   * Retrieve session state
   */
  async retrieveSession(conversationId: string, userId: string): Promise<SessionDocument | null> {
    try {
      const session = await this.collection.findOne({
        conversationId,
        userId,
      });

      if (session) {
        this.logger.debug({ conversationId, userId }, 'Session retrieved');
      }

      return session;
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to retrieve session');
      throw error;
    }
  }

  /**
   * Update session state
   */
  async updateSession(
    conversationId: string,
    userId: string,
    updates: Partial<Omit<SessionDocument, 'conversationId' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.sessionLifetimeHours * 3600000);

      await this.collection.updateOne(
        { conversationId, userId },
        {
          $set: {
            ...updates,
            updatedAt: now,
            expiresAt,
          },
        }
      );

      this.logger.debug({ conversationId, userId }, 'Session updated');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to update session');
      throw error;
    }
  }

  /**
   * Archive old session
   */
  async archiveSession(conversationId: string, userId: string): Promise<void> {
    try {
      const session = await this.retrieveSession(conversationId, userId);
      
      if (session) {
        // Move to archive collection
        const archiveCollection = this.collection.db.collection('sessions_archive');
        await archiveCollection.insertOne({
          ...session,
          archivedAt: new Date(),
        });

        // Delete from active sessions
        await this.collection.deleteOne({ conversationId, userId });

        this.logger.info({ conversationId, userId }, 'Session archived');
      }
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to archive session');
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(conversationId: string, userId: string): Promise<void> {
    try {
      await this.collection.deleteOne({ conversationId, userId });
      this.logger.info({ conversationId, userId }, 'Session deleted');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to delete session');
      throw error;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionDocument[]> {
    try {
      const sessions = await this.collection.find({ userId }).toArray();
      this.logger.debug({ userId, count: sessions.length }, 'User sessions retrieved');
      return sessions;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user sessions');
      throw error;
    }
  }

  /**
   * Get all sessions for a conversation
   */
  async getConversationSessions(conversationId: string): Promise<SessionDocument[]> {
    try {
      const sessions = await this.collection.find({ conversationId }).toArray();
      this.logger.debug({ conversationId, count: sessions.length }, 'Conversation sessions retrieved');
      return sessions;
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to get conversation sessions');
      throw error;
    }
  }

  /**
   * Cleanup expired sessions (manual trigger)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.collection.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      this.logger.info({ deletedCount: result.deletedCount }, 'Expired sessions cleaned up');
      return result.deletedCount;
    } catch (error) {
      this.logger.error({ error }, 'Failed to cleanup expired sessions');
      throw error;
    }
  }
}
