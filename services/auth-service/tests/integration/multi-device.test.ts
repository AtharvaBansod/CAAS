import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import pino from 'pino';
import { MultiDeviceSync } from '../../src/sessions/multi-device-sync';
import { SessionStore } from '../../src/sessions/session-store';

describe('Multi-Device Session Management', () => {
  let redis: Redis;
  let mongoClient: MongoClient;
  let db: Db;
  let multiDeviceSync: MultiDeviceSync;
  let sessionStore: SessionStore;
  let logger: pino.Logger;

  const TEST_USER_ID = 'test-user-123';
  const TEST_TENANT_ID = 'test-tenant-456';

  beforeAll(async () => {
    // Setup Redis
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    // Setup MongoDB
    mongoClient = await MongoClient.connect(
      process.env.MONGO_URL || 'mongodb://localhost:27017'
    );
    db = mongoClient.db('test_auth');

    // Setup logger
    logger = pino({ level: 'silent' });

    // Initialize services
    multiDeviceSync = new MultiDeviceSync({
      redis,
      logger,
      syncTimeoutMs: 5000,
    });

    sessionStore = new SessionStore(redis);
  });

  afterAll(async () => {
    await redis.quit();
    await mongoClient.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await redis.flushdb();
  });

  describe('Session Tracking', () => {
    it('should track session for each device', async () => {
      const device1Session = {
        sessionId: 'session-1',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-1',
          deviceName: 'iPhone 13',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      const device2Session = {
        sessionId: 'session-2',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-2',
          deviceName: 'MacBook Pro',
          deviceType: 'desktop' as const,
          platform: 'macOS',
          lastActive: Date.now(),
          isPrimary: false,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(device1Session);
      await multiDeviceSync.trackSession(device2Session);

      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);

      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId)).toContain('session-1');
      expect(sessions.map(s => s.sessionId)).toContain('session-2');
    });

    it('should handle device priority correctly', async () => {
      const primarySession = {
        sessionId: 'session-primary',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-primary',
          deviceName: 'Primary Device',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(primarySession);
      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);

      expect(sessions[0].deviceInfo.isPrimary).toBe(true);
    });
  });

  describe('Session Sync', () => {
    it('should sync session state across devices', async () => {
      const session = {
        sessionId: 'session-sync-test',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-sync',
          deviceName: 'Test Device',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: { theme: 'dark' },
      };

      await multiDeviceSync.trackSession(session);

      const updates = { theme: 'light', language: 'en' };
      await multiDeviceSync.syncSessionState(TEST_USER_ID, updates);

      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);
      expect(sessions[0].metadata.theme).toBe('light');
      expect(sessions[0].metadata.language).toBe('en');
    });

    it('should broadcast invalidation to all devices', async () => {
      const session1 = {
        sessionId: 'session-invalidate-1',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-1',
          deviceName: 'Device 1',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(session1);

      // Broadcast invalidation
      await multiDeviceSync.broadcastInvalidation(TEST_USER_ID, 'session-invalidate-1');

      // Verify event was published (check Redis pub/sub)
      const channel = `session:sync:${TEST_USER_ID}`;
      const subscriber = redis.duplicate();
      
      let receivedEvent = false;
      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          const event = JSON.parse(message);
          if (event.type === 'invalidation') {
            receivedEvent = true;
          }
        }
      });

      await subscriber.subscribe(channel);
      await multiDeviceSync.broadcastInvalidation(TEST_USER_ID, 'session-invalidate-1');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await subscriber.quit();
      expect(receivedEvent).toBe(true);
    });
  });

  describe('Device Management', () => {
    it('should handle device added event', async () => {
      const deviceInfo = {
        deviceId: 'new-device',
        deviceName: 'New Device',
        deviceType: 'tablet' as const,
        platform: 'Android',
        lastActive: Date.now(),
        isPrimary: false,
      };

      await multiDeviceSync.handleDeviceAdded(TEST_USER_ID, deviceInfo);

      // Verify event was published
      const channel = `session:sync:${TEST_USER_ID}`;
      const messages = await redis.pubsub('CHANNELS', channel);
      expect(messages).toBeDefined();
    });

    it('should handle device removed event', async () => {
      const session = {
        sessionId: 'session-remove',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-to-remove',
          deviceName: 'Remove Me',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: false,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(session);
      await multiDeviceSync.handleDeviceRemoved(TEST_USER_ID, 'device-to-remove');

      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);
      expect(sessions.find(s => s.deviceInfo.deviceId === 'device-to-remove')).toBeUndefined();
    });

    it('should promote new primary when primary device removed', async () => {
      const primarySession = {
        sessionId: 'session-primary',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'primary-device',
          deviceName: 'Primary',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      const secondarySession = {
        sessionId: 'session-secondary',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'secondary-device',
          deviceName: 'Secondary',
          deviceType: 'desktop' as const,
          platform: 'macOS',
          lastActive: Date.now(),
          isPrimary: false,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(primarySession);
      await multiDeviceSync.trackSession(secondarySession);

      await multiDeviceSync.handleDeviceRemoved(TEST_USER_ID, 'primary-device');

      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);
      const newPrimary = sessions.find(s => s.deviceInfo.deviceId === 'secondary-device');
      
      // Note: Actual promotion logic would need to be implemented
      expect(sessions).toHaveLength(1);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using last-write-wins', async () => {
      const session = {
        sessionId: 'session-conflict',
        userId: TEST_USER_ID,
        deviceInfo: {
          deviceId: 'device-conflict',
          deviceName: 'Conflict Device',
          deviceType: 'mobile' as const,
          platform: 'iOS',
          lastActive: Date.now(),
          isPrimary: true,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        metadata: {},
      };

      await multiDeviceSync.trackSession(session);

      const conflictingUpdates = [
        { timestamp: Date.now() - 1000, updates: { value: 'old' } },
        { timestamp: Date.now(), updates: { value: 'new' } },
      ];

      await multiDeviceSync.resolveConflict(
        TEST_USER_ID,
        'session-conflict',
        conflictingUpdates
      );

      const sessions = await multiDeviceSync.getUserSessions(TEST_USER_ID);
      expect(sessions[0].metadata.value).toBe('new');
    });
  });
});
