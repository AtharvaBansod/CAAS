import { EventEmitter } from 'events';
import Redis from 'ioredis';

interface DeliveryStatus {
  message_id: string;
  status: 'pending' | 'persisted' | 'failed';
  timestamp: Date;
  error?: string;
  retries?: number;
}

interface DeliveryConfirmationConfig {
  redis: Redis;
  timeoutMs: number;
  maxRetries: number;
}

export class DeliveryConfirmationTracker extends EventEmitter {
  private redis: Redis;
  private timeoutMs: number;
  private maxRetries: number;
  private pendingConfirmations: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: DeliveryConfirmationConfig) {
    super();
    this.redis = config.redis;
    this.timeoutMs = config.timeoutMs || 5000;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Track message awaiting persistence confirmation
   */
  async trackMessage(messageId: string, socketId: string): Promise<void> {
    const status: DeliveryStatus = {
      message_id: messageId,
      status: 'pending',
      timestamp: new Date(),
      retries: 0,
    };

    // Store in Redis
    await this.redis.setex(
      `delivery:${messageId}`,
      this.timeoutMs / 1000 + 60, // TTL slightly longer than timeout
      JSON.stringify(status)
    );

    // Store socket mapping
    await this.redis.setex(
      `delivery:socket:${messageId}`,
      this.timeoutMs / 1000 + 60,
      socketId
    );

    // Set timeout for confirmation
    const timeout = setTimeout(() => {
      this.handleTimeout(messageId);
    }, this.timeoutMs);

    this.pendingConfirmations.set(messageId, timeout);
  }

  /**
   * Confirm message persistence
   */
  async confirmPersistence(messageId: string): Promise<void> {
    // Clear timeout
    const timeout = this.pendingConfirmations.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingConfirmations.delete(messageId);
    }

    // Update status
    const statusKey = `delivery:${messageId}`;
    const statusData = await this.redis.get(statusKey);
    
    if (statusData) {
      const status: DeliveryStatus = JSON.parse(statusData);
      status.status = 'persisted';
      status.timestamp = new Date();

      await this.redis.setex(
        statusKey,
        3600, // Keep for 1 hour for audit
        JSON.stringify(status)
      );

      // Get socket ID
      const socketId = await this.redis.get(`delivery:socket:${messageId}`);
      
      this.emit('message:persisted', {
        message_id: messageId,
        socket_id: socketId,
      });
    }
  }

  /**
   * Mark message persistence as failed
   */
  async markFailed(messageId: string, error: string): Promise<void> {
    // Clear timeout
    const timeout = this.pendingConfirmations.get(messageId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingConfirmations.delete(messageId);
    }

    // Update status
    const statusKey = `delivery:${messageId}`;
    const statusData = await this.redis.get(statusKey);
    
    if (statusData) {
      const status: DeliveryStatus = JSON.parse(statusData);
      status.status = 'failed';
      status.timestamp = new Date();
      status.error = error;

      await this.redis.setex(
        statusKey,
        3600, // Keep for 1 hour for audit
        JSON.stringify(status)
      );

      // Get socket ID
      const socketId = await this.redis.get(`delivery:socket:${messageId}`);
      
      this.emit('message:persist_failed', {
        message_id: messageId,
        socket_id: socketId,
        error,
      });

      // Check if should retry
      if ((status.retries || 0) < this.maxRetries) {
        this.emit('message:retry', {
          message_id: messageId,
          retry_count: (status.retries || 0) + 1,
        });
      }
    }
  }

  /**
   * Handle timeout for confirmation
   */
  private async handleTimeout(messageId: string): Promise<void> {
    this.pendingConfirmations.delete(messageId);

    const statusKey = `delivery:${messageId}`;
    const statusData = await this.redis.get(statusKey);
    
    if (statusData) {
      const status: DeliveryStatus = JSON.parse(statusData);
      
      if (status.status === 'pending') {
        status.status = 'failed';
        status.timestamp = new Date();
        status.error = 'Persistence confirmation timeout';

        await this.redis.setex(
          statusKey,
          3600,
          JSON.stringify(status)
        );

        // Get socket ID
        const socketId = await this.redis.get(`delivery:socket:${messageId}`);
        
        this.emit('message:timeout', {
          message_id: messageId,
          socket_id: socketId,
        });

        // Check if should retry
        if ((status.retries || 0) < this.maxRetries) {
          this.emit('message:retry', {
            message_id: messageId,
            retry_count: (status.retries || 0) + 1,
          });
        }
      }
    }
  }

  /**
   * Get delivery status
   */
  async getStatus(messageId: string): Promise<DeliveryStatus | null> {
    const statusData = await this.redis.get(`delivery:${messageId}`);
    if (statusData) {
      return JSON.parse(statusData);
    }
    return null;
  }

  /**
   * Increment retry count
   */
  async incrementRetry(messageId: string): Promise<void> {
    const statusKey = `delivery:${messageId}`;
    const statusData = await this.redis.get(statusKey);
    
    if (statusData) {
      const status: DeliveryStatus = JSON.parse(statusData);
      status.retries = (status.retries || 0) + 1;
      status.status = 'pending';
      status.timestamp = new Date();

      await this.redis.setex(
        statusKey,
        this.timeoutMs / 1000 + 60,
        JSON.stringify(status)
      );
    }
  }

  /**
   * Clean up expired confirmations
   */
  cleanup(): void {
    for (const [messageId, timeout] of this.pendingConfirmations.entries()) {
      clearTimeout(timeout);
    }
    this.pendingConfirmations.clear();
  }
}
