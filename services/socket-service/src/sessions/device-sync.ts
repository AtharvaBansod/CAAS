import { Server, Socket } from 'socket.io';
import { Redis } from 'ioredis';
import { Logger } from 'pino';

interface DeviceSyncConfig {
  redis: Redis;
  logger: Logger;
}

export class DeviceSync {
  private redis: Redis;
  private logger: Logger;
  private subscriber: Redis;

  constructor(config: DeviceSyncConfig) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.subscriber = config.redis.duplicate();
    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleSyncMessage(channel, message);
    });
  }

  /**
   * Register socket for session sync
   */
  async registerSocket(socket: Socket, userId: string): Promise<void> {
    const channel = `session:sync:${userId}`;
    
    try {
      await this.subscriber.subscribe(channel);
      
      // Store socket reference for this user
      socket.data.syncChannel = channel;
      
      this.logger.info({ userId, socketId: socket.id }, 'Socket registered for session sync');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to register socket for sync');
      throw error;
    }
  }

  /**
   * Unregister socket from session sync
   */
  async unregisterSocket(socket: Socket): Promise<void> {
    const channel = socket.data.syncChannel;
    
    if (channel) {
      try {
        await this.subscriber.unsubscribe(channel);
        this.logger.info({ socketId: socket.id, channel }, 'Socket unregistered from session sync');
      } catch (error) {
        this.logger.error({ error, channel }, 'Failed to unregister socket from sync');
      }
    }
  }

  /**
   * Handle sync message from Redis pub/sub
   */
  private handleSyncMessage(channel: string, message: string): void {
    try {
      const event = JSON.parse(message);
      const userId = channel.replace('session:sync:', '');

      // Emit to all sockets for this user
      // Note: In production, use Socket.IO rooms
      this.logger.debug({ userId, eventType: event.type }, 'Sync message received');
    } catch (error) {
      this.logger.error({ error, channel, message }, 'Failed to handle sync message');
    }
  }

  /**
   * Handle session sync request
   */
  async handleSyncRequest(socket: Socket, io: Server): Promise<void> {
    const userId = socket.data.userId;

    try {
      this.logger.info({ userId, socketId: socket.id }, 'Session sync requested');

      // Get current session state from Redis
      const sessionKey = `session:${socket.data.sessionId}`;
      const sessionData = await this.redis.get(sessionKey);

      if (sessionData) {
        socket.emit('session:sync_update', {
          session: JSON.parse(sessionData),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to handle sync request');
      socket.emit('session:sync_error', {
        error: 'Failed to sync session',
      });
    }
  }

  /**
   * Broadcast session update to all user devices
   */
  async broadcastSessionUpdate(
    io: Server,
    userId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      // Publish to Redis for cross-server sync
      const channel = `session:sync:${userId}`;
      const event = {
        type: 'session_update',
        userId,
        updates,
        timestamp: Date.now(),
      };

      await this.redis.publish(channel, JSON.stringify(event));

      // Emit to all connected sockets for this user
      io.to(`user:${userId}`).emit('session:sync_update', {
        updates,
        timestamp: Date.now(),
      });

      this.logger.info({ userId }, 'Session update broadcast');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to broadcast session update');
      throw error;
    }
  }

  /**
   * Handle session invalidation
   */
  async handleSessionInvalidated(
    io: Server,
    userId: string,
    sessionId: string,
    reason: string
  ): Promise<void> {
    try {
      // Publish invalidation event
      const channel = `session:sync:${userId}`;
      const event = {
        type: 'session_invalidated',
        userId,
        sessionId,
        reason,
        timestamp: Date.now(),
      };

      await this.redis.publish(channel, JSON.stringify(event));

      // Emit to all connected sockets
      io.to(`user:${userId}`).emit('session:invalidated', {
        sessionId,
        reason,
        timestamp: Date.now(),
      });

      this.logger.info({ userId, sessionId, reason }, 'Session invalidation handled');
    } catch (error) {
      this.logger.error({ error, userId, sessionId }, 'Failed to handle session invalidation');
      throw error;
    }
  }

  /**
   * Handle device added event
   */
  async handleDeviceAdded(
    io: Server,
    userId: string,
    deviceInfo: any
  ): Promise<void> {
    try {
      const channel = `session:sync:${userId}`;
      const event = {
        type: 'device_added',
        userId,
        deviceInfo,
        timestamp: Date.now(),
      };

      await this.redis.publish(channel, JSON.stringify(event));

      io.to(`user:${userId}`).emit('session:device_added', {
        deviceInfo,
        timestamp: Date.now(),
      });

      this.logger.info({ userId, deviceId: deviceInfo.deviceId }, 'Device added event handled');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to handle device added');
      throw error;
    }
  }

  /**
   * Handle device removed event
   */
  async handleDeviceRemoved(
    io: Server,
    userId: string,
    deviceId: string
  ): Promise<void> {
    try {
      const channel = `session:sync:${userId}`;
      const event = {
        type: 'device_removed',
        userId,
        deviceId,
        timestamp: Date.now(),
      };

      await this.redis.publish(channel, JSON.stringify(event));

      io.to(`user:${userId}`).emit('session:device_removed', {
        deviceId,
        timestamp: Date.now(),
      });

      this.logger.info({ userId, deviceId }, 'Device removed event handled');
    } catch (error) {
      this.logger.error({ error, userId, deviceId }, 'Failed to handle device removed');
      throw error;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async cleanup(): Promise<void> {
    await this.subscriber.quit();
    this.logger.info('Device sync cleanup complete');
  }
}
