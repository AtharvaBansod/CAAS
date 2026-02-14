import { Redis } from 'ioredis';
import { Logger } from 'pino';

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'web' | 'tablet';
  platform: string;
  lastActive: number;
  isPrimary: boolean;
}

interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: number;
  expiresAt: number;
  metadata: Record<string, any>;
}

interface SessionSyncConfig {
  redis: Redis;
  logger: Logger;
  syncTimeoutMs: number;
}

export class MultiDeviceSync {
  private redis: Redis;
  private logger: Logger;
  private syncTimeoutMs: number;

  constructor(config: SessionSyncConfig) {
    this.redis = config.redis;
    this.logger = config.logger;
    this.syncTimeoutMs = config.syncTimeoutMs;
  }

  /**
   * Track new session for user
   */
  async trackSession(session: SessionInfo): Promise<void> {
    const userSessionsKey = `user:sessions:${session.userId}`;
    const sessionKey = `session:${session.sessionId}`;

    try {
      // Store session details
      await this.redis.setex(
        sessionKey,
        Math.floor((session.expiresAt - Date.now()) / 1000),
        JSON.stringify(session)
      );

      // Add to user's session set
      await this.redis.sadd(userSessionsKey, session.sessionId);

      // Set expiry on user sessions set
      await this.redis.expire(userSessionsKey, 86400 * 30); // 30 days

      this.logger.info(
        { userId: session.userId, sessionId: session.sessionId, deviceId: session.deviceInfo.deviceId },
        'Session tracked'
      );
    } catch (error) {
      this.logger.error({ error, session }, 'Failed to track session');
      throw error;
    }
  }

  /**
   * Get all active sessions for user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const userSessionsKey = `user:sessions:${userId}`;

    try {
      const sessionIds = await this.redis.smembers(userSessionsKey);
      const sessions: SessionInfo[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = `session:${sessionId}`;
        const sessionData = await this.redis.get(sessionKey);

        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        } else {
          // Clean up stale reference
          await this.redis.srem(userSessionsKey, sessionId);
        }
      }

      this.logger.debug({ userId, sessionCount: sessions.length }, 'User sessions retrieved');
      return sessions;
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to get user sessions');
      throw error;
    }
  }

  /**
   * Sync session state across all user devices
   */
  async syncSessionState(userId: string, updates: Record<string, any>): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);

      // Update all sessions
      for (const session of sessions) {
        const sessionKey = `session:${session.sessionId}`;
        const updatedSession = {
          ...session,
          metadata: {
            ...session.metadata,
            ...updates,
          },
        };

        await this.redis.setex(
          sessionKey,
          Math.floor((session.expiresAt - Date.now()) / 1000),
          JSON.stringify(updatedSession)
        );
      }

      // Publish sync event
      await this.publishSyncEvent(userId, 'session_update', updates);

      this.logger.info({ userId, sessionCount: sessions.length }, 'Session state synced');
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to sync session state');
      throw error;
    }
  }

  /**
   * Broadcast session invalidation to all devices
   */
  async broadcastInvalidation(userId: string, sessionId?: string): Promise<void> {
    try {
      const event = sessionId
        ? { type: 'session_invalidated', sessionId }
        : { type: 'all_sessions_invalidated' };

      await this.publishSyncEvent(userId, 'invalidation', event);

      this.logger.info({ userId, sessionId }, 'Session invalidation broadcast');
    } catch (error) {
      this.logger.error({ error, userId, sessionId }, 'Failed to broadcast invalidation');
      throw error;
    }
  }

  /**
   * Handle device added event
   */
  async handleDeviceAdded(userId: string, deviceInfo: DeviceInfo): Promise<void> {
    try {
      // Determine if this should be primary device
      const sessions = await this.getUserSessions(userId);
      const hasPrimary = sessions.some(s => s.deviceInfo.isPrimary);

      if (!hasPrimary) {
        deviceInfo.isPrimary = true;
      }

      // Broadcast device added event
      await this.publishSyncEvent(userId, 'device_added', { deviceInfo });

      this.logger.info({ userId, deviceId: deviceInfo.deviceId }, 'Device added');
    } catch (error) {
      this.logger.error({ error, userId, deviceInfo }, 'Failed to handle device added');
      throw error;
    }
  }

  /**
   * Handle device removed event
   */
  async handleDeviceRemoved(userId: string, deviceId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);
      const removedSession = sessions.find(s => s.deviceInfo.deviceId === deviceId);

      if (removedSession) {
        // Remove session
        await this.removeSession(userId, removedSession.sessionId);

        // If primary device was removed, promote another
        if (removedSession.deviceInfo.isPrimary && sessions.length > 1) {
          const newPrimary = sessions.find(s => s.sessionId !== removedSession.sessionId);
          if (newPrimary) {
            await this.setPrimaryDevice(userId, newPrimary.deviceInfo.deviceId);
          }
        }
      }

      // Broadcast device removed event
      await this.publishSyncEvent(userId, 'device_removed', { deviceId });

      this.logger.info({ userId, deviceId }, 'Device removed');
    } catch (error) {
      this.logger.error({ error, userId, deviceId }, 'Failed to handle device removed');
      throw error;
    }
  }

  /**
   * Set primary device
   */
  async setPrimaryDevice(userId: string, deviceId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);

      for (const session of sessions) {
        const sessionKey = `session:${session.sessionId}`;
        session.deviceInfo.isPrimary = session.deviceInfo.deviceId === deviceId;

        await this.redis.setex(
          sessionKey,
          Math.floor((session.expiresAt - Date.now()) / 1000),
          JSON.stringify(session)
        );
      }

      await this.publishSyncEvent(userId, 'primary_device_changed', { deviceId });

      this.logger.info({ userId, deviceId }, 'Primary device set');
    } catch (error) {
      this.logger.error({ error, userId, deviceId }, 'Failed to set primary device');
      throw error;
    }
  }

  /**
   * Resolve session conflict (last-write-wins)
   */
  async resolveConflict(
    userId: string,
    sessionId: string,
    conflictingUpdates: Array<{ timestamp: number; updates: Record<string, any> }>
  ): Promise<void> {
    try {
      // Sort by timestamp and take latest
      conflictingUpdates.sort((a, b) => b.timestamp - a.timestamp);
      const winningUpdate = conflictingUpdates[0];

      // Apply winning update
      await this.syncSessionState(userId, winningUpdate.updates);

      this.logger.info({ userId, sessionId }, 'Session conflict resolved');
    } catch (error) {
      this.logger.error({ error, userId, sessionId }, 'Failed to resolve conflict');
      throw error;
    }
  }

  /**
   * Remove session
   */
  private async removeSession(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `user:sessions:${userId}`;
    const sessionKey = `session:${sessionId}`;

    await this.redis.del(sessionKey);
    await this.redis.srem(userSessionsKey, sessionId);
  }

  /**
   * Publish sync event via Redis pub/sub
   */
  private async publishSyncEvent(
    userId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    const channel = `session:sync:${userId}`;
    const event = {
      type: eventType,
      userId,
      data,
      timestamp: Date.now(),
    };

    await this.redis.publish(channel, JSON.stringify(event));
  }

  /**
   * Subscribe to sync events for user
   */
  async subscribeToSyncEvents(
    userId: string,
    callback: (event: any) => void
  ): Promise<void> {
    const channel = `session:sync:${userId}`;
    const subscriber = this.redis.duplicate();

    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const event = JSON.parse(message);
          callback(event);
        } catch (error) {
          this.logger.error({ error, message }, 'Failed to parse sync event');
        }
      }
    });

    this.logger.info({ userId }, 'Subscribed to sync events');
  }
}
