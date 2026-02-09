import { getLogger } from '../utils/logger';

const logger = getLogger('TypingTimeoutManager');

export type TimeoutCallback = (userId: string, conversationId: string) => Promise<void>;

export class TypingTimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly defaultTimeoutMs: number;

  constructor(timeoutMs: number = 3000) {
    this.defaultTimeoutMs = timeoutMs;
  }

  private getKey(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  scheduleTimeout(
    userId: string,
    conversationId: string,
    callback: TimeoutCallback,
    timeoutMs?: number
  ): void {
    const key = this.getKey(userId, conversationId);

    // Cancel existing timeout
    this.cancelTimeout(userId, conversationId);

    // Schedule new timeout
    const timeout = setTimeout(async () => {
      try {
        await callback(userId, conversationId);
        this.timeouts.delete(key);
        logger.debug(`Typing timeout triggered for user ${userId} in ${conversationId}`);
      } catch (error: any) {
        logger.error('Error in typing timeout callback', error);
      }
    }, timeoutMs || this.defaultTimeoutMs);

    this.timeouts.set(key, timeout);
    logger.debug(`Scheduled typing timeout for user ${userId} in ${conversationId}`);
  }

  cancelTimeout(userId: string, conversationId: string): void {
    const key = this.getKey(userId, conversationId);
    const timeout = this.timeouts.get(key);

    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
      logger.debug(`Cancelled typing timeout for user ${userId} in ${conversationId}`);
    }
  }

  cancelAllForUser(userId: string): void {
    let cancelled = 0;
    for (const [key, timeout] of this.timeouts.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
        cancelled++;
      }
    }

    if (cancelled > 0) {
      logger.debug(`Cancelled ${cancelled} typing timeouts for user ${userId}`);
    }
  }

  cancelAllForConversation(conversationId: string): void {
    let cancelled = 0;
    for (const [key, timeout] of this.timeouts.entries()) {
      if (key.endsWith(`:${conversationId}`)) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
        cancelled++;
      }
    }

    if (cancelled > 0) {
      logger.debug(`Cancelled ${cancelled} typing timeouts for conversation ${conversationId}`);
    }
  }

  getActiveTimeoutCount(): number {
    return this.timeouts.size;
  }

  cleanup(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    logger.info('Cleaned up all typing timeouts');
  }
}
