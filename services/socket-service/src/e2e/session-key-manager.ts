import { Redis } from 'ioredis';
import { Logger } from 'pino';
import { DoubleRatchet } from './double-ratchet';

interface SessionState {
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
  createdAt: number;
  lastRotation: number;
  messageCount: number;
}

interface SessionKeyManagerConfig {
  redis: Redis;
  logger: Logger;
  sessionKeyLifetimeHours: number;
  rotationThreshold: number;
}

export class SessionKeyManager {
  private redis: Redis;
  private logger: Logger;
  private sessionKeyLifetimeHours: number;
  private rotationThreshold: number;
  private ratchets: Map<string, DoubleRatchet>;

  constructor(config: SessionKeyManagerConfig) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.sessionKeyLifetimeHours = config.sessionKeyLifetimeHours;
    this.rotationThreshold = config.rotationThreshold;
    this.ratchets = new Map();
  }

  /**
   * Initialize a new session
   */
  async initializeSession(
    conversationId: string,
    userId: string,
    partnerId: string,
    sharedSecret: string,
    isInitiator: boolean
  ): Promise<void> {
    const sessionKey = this.getSessionKey(conversationId, userId);

    try {
      // Create double ratchet instance
      const ratchet = new DoubleRatchet(sharedSecret, isInitiator, this.logger);
      this.ratchets.set(sessionKey, ratchet);

      // Store initial session state
      const sessionState: SessionState = {
        conversationId,
        userId,
        partnerId,
        rootKey: sharedSecret,
        sendingChainKey: ratchet.getSendingChainKey(),
        receivingChainKey: ratchet.getReceivingChainKey(),
        sendingChainLength: 0,
        receivingChainLength: 0,
        previousSendingChainLength: 0,
        skippedMessageKeys: {},
        createdAt: Date.now(),
        lastRotation: Date.now(),
        messageCount: 0,
      };

      await this.saveSessionState(sessionKey, sessionState);

      this.logger.info({ conversationId, userId, partnerId }, 'Session initialized');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to initialize session');
      throw error;
    }
  }

  /**
   * Get message key for encryption
   */
  async getMessageKey(conversationId: string, userId: string): Promise<string> {
    const sessionKey = this.getSessionKey(conversationId, userId);
    
    try {
      let ratchet = this.ratchets.get(sessionKey);
      
      if (!ratchet) {
        // Load from Redis
        const sessionState = await this.loadSessionState(sessionKey);
        if (!sessionState) {
          throw new Error('Session not found');
        }
        
        ratchet = await this.restoreRatchet(sessionState);
        this.ratchets.set(sessionKey, ratchet);
      }

      // Get next message key
      const messageKey = ratchet.ratchetSendingChain();

      // Update session state
      await this.updateSessionState(sessionKey);

      // Check if rotation is needed
      await this.checkRotation(sessionKey);

      return messageKey;
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to get message key');
      throw error;
    }
  }

  /**
   * Decrypt message with key
   */
  async decryptMessage(
    conversationId: string,
    userId: string,
    messageNumber: number,
    chainLength: number
  ): Promise<string> {
    const sessionKey = this.getSessionKey(conversationId, userId);
    
    try {
      let ratchet = this.ratchets.get(sessionKey);
      
      if (!ratchet) {
        const sessionState = await this.loadSessionState(sessionKey);
        if (!sessionState) {
          throw new Error('Session not found');
        }
        
        ratchet = await this.restoreRatchet(sessionState);
        this.ratchets.set(sessionKey, ratchet);
      }

      // Handle out-of-order messages
      const messageKey = await ratchet.ratchetReceivingChain(messageNumber, chainLength);

      // Update session state
      await this.updateSessionState(sessionKey);

      return messageKey;
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to decrypt message');
      throw error;
    }
  }

  /**
   * Rotate session keys
   */
  async rotateKeys(conversationId: string, userId: string, newRootKey: string): Promise<void> {
    const sessionKey = this.getSessionKey(conversationId, userId);
    
    try {
      const sessionState = await this.loadSessionState(sessionKey);
      if (!sessionState) {
        throw new Error('Session not found');
      }

      // Create new ratchet with new root key
      const ratchet = new DoubleRatchet(newRootKey, true, this.logger);
      this.ratchets.set(sessionKey, ratchet);

      // Update session state
      sessionState.rootKey = newRootKey;
      sessionState.sendingChainKey = ratchet.getSendingChainKey();
      sessionState.receivingChainKey = ratchet.getReceivingChainKey();
      sessionState.previousSendingChainLength = sessionState.sendingChainLength;
      sessionState.sendingChainLength = 0;
      sessionState.receivingChainLength = 0;
      sessionState.lastRotation = Date.now();
      sessionState.messageCount = 0;

      // Clear old skipped keys (forward secrecy)
      sessionState.skippedMessageKeys = {};

      await this.saveSessionState(sessionKey, sessionState);

      this.logger.info({ conversationId, userId }, 'Session keys rotated');
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to rotate keys');
      throw error;
    }
  }

  /**
   * Check if rotation is needed
   */
  private async checkRotation(sessionKey: string): Promise<void> {
    const sessionState = await this.loadSessionState(sessionKey);
    if (!sessionState) return;

    const needsRotation = 
      sessionState.messageCount >= this.rotationThreshold ||
      Date.now() - sessionState.lastRotation > this.sessionKeyLifetimeHours * 3600000;

    if (needsRotation) {
      this.logger.info({ sessionKey }, 'Session rotation needed');
      // Emit event for key rotation (handled by application layer)
    }
  }

  /**
   * Archive old session
   */
  async archiveSession(conversationId: string, userId: string): Promise<void> {
    const sessionKey = this.getSessionKey(conversationId, userId);
    
    try {
      const archiveKey = `${sessionKey}:archived:${Date.now()}`;
      const sessionState = await this.loadSessionState(sessionKey);
      
      if (sessionState) {
        await this.redis.setex(archiveKey, 86400 * 30, JSON.stringify(sessionState)); // 30 days
        await this.redis.del(sessionKey);
        this.ratchets.delete(sessionKey);
        
        this.logger.info({ conversationId, userId }, 'Session archived');
      }
    } catch (error) {
      this.logger.error({ error, conversationId, userId }, 'Failed to archive session');
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private getSessionKey(conversationId: string, userId: string): string {
    return `session:${conversationId}:${userId}`;
  }

  private async saveSessionState(sessionKey: string, state: SessionState): Promise<void> {
    await this.redis.setex(
      sessionKey,
      this.sessionKeyLifetimeHours * 3600,
      JSON.stringify(state)
    );
  }

  private async loadSessionState(sessionKey: string): Promise<SessionState | null> {
    const data = await this.redis.get(sessionKey);
    return data ? JSON.parse(data) : null;
  }

  private async updateSessionState(sessionKey: string): Promise<void> {
    const sessionState = await this.loadSessionState(sessionKey);
    if (!sessionState) return;

    const ratchet = this.ratchets.get(sessionKey);
    if (!ratchet) return;

    sessionState.sendingChainKey = ratchet.getSendingChainKey();
    sessionState.receivingChainKey = ratchet.getReceivingChainKey();
    sessionState.sendingChainLength = ratchet.getSendingChainLength();
    sessionState.receivingChainLength = ratchet.getReceivingChainLength();
    sessionState.messageCount++;

    await this.saveSessionState(sessionKey, sessionState);
  }

  private async restoreRatchet(sessionState: SessionState): Promise<DoubleRatchet> {
    const ratchet = new DoubleRatchet(sessionState.rootKey, true, this.logger);
    ratchet.restore(
      sessionState.sendingChainKey,
      sessionState.receivingChainKey,
      sessionState.sendingChainLength,
      sessionState.receivingChainLength
    );
    return ratchet;
  }
}
