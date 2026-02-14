import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { MultiDeviceSync, SessionInfo } from '../../src/sessions/multi-device-sync';

export class DeviceSimulator extends EventEmitter {
  private multiDeviceSync: MultiDeviceSync;
  private deviceId: string;
  private userId: string;
  private sessionId: string;
  private subscriber: Redis;

  constructor(
    redis: Redis,
    logger: Logger,
    userId: string,
    deviceId: string
  ) {
    super();
    
    this.userId = userId;
    this.deviceId = deviceId;
    this.sessionId = `session-${deviceId}`;
    this.subscriber = redis.duplicate();

    this.multiDeviceSync = new MultiDeviceSync({
      redis,
      logger,
      syncTimeoutMs: 5000,
    });

    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    const channel = `session:sync:${this.userId}`;
    
    this.subscriber.subscribe(channel);
    
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const event = JSON.parse(message);
          this.handleSyncEvent(event);
        } catch (error) {
          console.error('Failed to parse sync event:', error);
        }
      }
    });
  }

  private handleSyncEvent(event: any): void {
    this.emit('sync-event', event);

    switch (event.type) {
      case 'session_update':
        this.emit('session-update', event.data);
        break;
      case 'invalidation':
        this.emit('session-invalidated', event.data);
        break;
      case 'device_added':
        this.emit('device-added', event.data);
        break;
      case 'device_removed':
        this.emit('device-removed', event.data);
        break;
    }
  }

  async connect(): Promise<void> {
    const session: SessionInfo = {
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: {
        deviceId: this.deviceId,
        deviceName: `Simulated Device ${this.deviceId}`,
        deviceType: 'mobile',
        platform: 'Test',
        lastActive: Date.now(),
        isPrimary: false,
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000,
      metadata: {},
    };

    await this.multiDeviceSync.trackSession(session);
    this.emit('connected', session);
  }

  async disconnect(): Promise<void> {
    await this.multiDeviceSync.handleDeviceRemoved(this.userId, this.deviceId);
    await this.subscriber.quit();
    this.emit('disconnected');
  }

  async updateSession(updates: Record<string, any>): Promise<void> {
    await this.multiDeviceSync.syncSessionState(this.userId, updates);
    this.emit('session-updated', updates);
  }

  async requestSync(): Promise<void> {
    // Simulate sync request
    this.emit('sync-requested');
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string {
    return this.userId;
  }

  async waitForEvent(eventName: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      this.once(eventName, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }
}

export class MultiDeviceSimulator {
  private devices: Map<string, DeviceSimulator>;
  private redis: Redis;
  private logger: Logger;
  private userId: string;

  constructor(redis: Redis, logger: Logger, userId: string) {
    this.devices = new Map();
    this.redis = redis;
    this.logger = logger;
    this.userId = userId;
  }

  async addDevice(deviceId: string): Promise<DeviceSimulator> {
    const device = new DeviceSimulator(
      this.redis,
      this.logger,
      this.userId,
      deviceId
    );

    await device.connect();
    this.devices.set(deviceId, device);

    return device;
  }

  async removeDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      await device.disconnect();
      this.devices.delete(deviceId);
    }
  }

  getDevice(deviceId: string): DeviceSimulator | undefined {
    return this.devices.get(deviceId);
  }

  getAllDevices(): DeviceSimulator[] {
    return Array.from(this.devices.values());
  }

  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.devices.values()).map(device =>
      device.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.devices.clear();
  }

  async simulateConflict(
    deviceId1: string,
    deviceId2: string,
    key: string,
    value1: any,
    value2: any
  ): Promise<void> {
    const device1 = this.devices.get(deviceId1);
    const device2 = this.devices.get(deviceId2);

    if (!device1 || !device2) {
      throw new Error('Both devices must be connected');
    }

    // Simulate simultaneous updates
    await Promise.all([
      device1.updateSession({ [key]: value1 }),
      device2.updateSession({ [key]: value2 }),
    ]);
  }

  async waitForAllDevices(eventName: string, timeout: number = 5000): Promise<any[]> {
    const promises = Array.from(this.devices.values()).map(device =>
      device.waitForEvent(eventName, timeout)
    );

    return Promise.all(promises);
  }

  getDeviceCount(): number {
    return this.devices.size;
  }
}

export const createDeviceSimulator = (
  redis: Redis,
  logger: Logger,
  userId: string,
  deviceId: string
): DeviceSimulator => {
  return new DeviceSimulator(redis, logger, userId, deviceId);
};

export const createMultiDeviceSimulator = (
  redis: Redis,
  logger: Logger,
  userId: string
): MultiDeviceSimulator => {
  return new MultiDeviceSimulator(redis, logger, userId);
};
