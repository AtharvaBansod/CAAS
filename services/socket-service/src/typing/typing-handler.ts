import { Server, Socket } from 'socket.io';
import { TypingStateStore, TypingUser } from './typing-state-store';
import { TypingTimeoutManager } from './typing-timeout-manager';
import { getLogger } from '../utils/logger';

const logger = getLogger('TypingHandler');

export class TypingHandler {
  private timeoutManager: TypingTimeoutManager;

  constructor(
    private io: Server,
    private stateStore: TypingStateStore,
    timeoutMs: number = 3000
  ) {
    this.timeoutManager = new TypingTimeoutManager(timeoutMs);
  }

  async handleTypingStart(
    socket: Socket,
    conversationId: string,
    userId: string,
    displayName: string,
    tenantId: string
  ): Promise<void> {
    try {
      const user: TypingUser = {
        user_id: userId,
        display_name: displayName,
        started_at: new Date(),
      };

      // Add to state store
      await this.stateStore.addTypingUser(conversationId, user);

      // Schedule automatic timeout
      this.timeoutManager.scheduleTimeout(
        userId,
        conversationId,
        async (uid, cid) => {
          await this.handleTypingTimeout(uid, cid, tenantId);
        }
      );

      logger.debug(`User ${userId} started typing in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to handle typing start', error);
    }
  }

  async handleTypingStop(
    socket: Socket,
    conversationId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Cancel timeout
      this.timeoutManager.cancelTimeout(userId, conversationId);

      // Remove from state store
      await this.stateStore.removeTypingUser(conversationId, userId);

      // Broadcast typing stop
      const roomName = `tenant:${tenantId}:conversation:${conversationId}`;
      socket.to(roomName).emit('user_typing', {
        conversation_id: conversationId,
        user: {
          id: userId,
        },
        is_typing: false,
      });

      logger.debug(`User ${userId} stopped typing in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to handle typing stop', error);
    }
  }

  private async handleTypingTimeout(
    userId: string,
    conversationId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Remove from state store
      await this.stateStore.removeTypingUser(conversationId, userId);

      // Broadcast typing stop
      const roomName = `tenant:${tenantId}:conversation:${conversationId}`;
      this.io.to(roomName).emit('user_typing', {
        conversation_id: conversationId,
        user: {
          id: userId,
        },
        is_typing: false,
        reason: 'timeout',
      });

      logger.debug(`Typing timeout for user ${userId} in conversation ${conversationId}`);
    } catch (error: any) {
      logger.error('Failed to handle typing timeout', error);
    }
  }

  async getTypingUsers(conversationId: string): Promise<TypingUser[]> {
    return this.stateStore.getTypingUsers(conversationId);
  }

  async clearUserTyping(userId: string): Promise<void> {
    this.timeoutManager.cancelAllForUser(userId);
    await this.stateStore.clearUserTyping(userId);
  }

  async clearConversationTyping(conversationId: string): Promise<void> {
    this.timeoutManager.cancelAllForConversation(conversationId);
    await this.stateStore.clearConversationTyping(conversationId);
  }

  cleanup(): void {
    this.timeoutManager.cleanup();
  }
}
