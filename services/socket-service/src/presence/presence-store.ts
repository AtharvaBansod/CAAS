import { MinimalRedisClient } from '../tokens/revocation-checker';
import { UserPresence, PresenceStatus } from './presence-types';

export class PresenceStore {
  private readonly PRESENCE_KEY_PREFIX: string;
  private readonly PRESENCE_TTL_SECONDS: number;
  private readonly SUBSCRIPTION_KEY_PREFIX: string;

  constructor(private redis: MinimalRedisClient, config: { prefix: string; ttl: number }) {
    this.PRESENCE_KEY_PREFIX = config.prefix;
    this.PRESENCE_TTL_SECONDS = config.ttl;
    this.SUBSCRIPTION_KEY_PREFIX = `${config.prefix}:subscribers`;
  }

  private getPresenceKey(userId: string): string {
    return `${this.PRESENCE_KEY_PREFIX}:${userId}`;
  }

  private getSubscriptionKey(userId: string): string {
    return `${this.SUBSCRIPTION_KEY_PREFIX}:${userId}`;
  }

  private parsePresence(data: string): UserPresence {
    const presence: UserPresence = JSON.parse(data);
    if (presence && presence.last_seen) {
      presence.last_seen = new Date(presence.last_seen);
    }
    if (!Array.isArray(presence.devices)) {
      presence.devices = [];
    }
    presence.devices.forEach(device => {
      if (device.last_active) {
        device.last_active = new Date(device.last_active);
      }
    });
    return presence;
  }

  async set(userId: string, presence: UserPresence): Promise<void> {
    const key = this.getPresenceKey(userId);
    await this.redis.set(key, JSON.stringify(presence), { EX: this.PRESENCE_TTL_SECONDS });
  }

  async get(userId: string): Promise<UserPresence | null> {
    const key = this.getPresenceKey(userId);
    const data = await this.redis.get(key);
    return data ? this.parsePresence(data) : null;
  }

  async mget(userIds: string[]): Promise<Map<string, UserPresence>> {
    if (userIds.length === 0) {
      return new Map();
    }
    const keys = userIds.map(userId => this.getPresenceKey(userId));
    const data = await this.redis.mGet(keys);
    const presenceMap = new Map<string, UserPresence>();
    userIds.forEach((userId, index) => {
      if (data[index]) {
        presenceMap.set(userId, this.parsePresence(data[index]!));
      }
    });
    return presenceMap;
  }

  async delete(userId: string): Promise<void> {
    const key = this.getPresenceKey(userId);
    await this.redis.del(key);
  }

  async getAllUserIds(): Promise<string[]> {
    const pattern = `${this.PRESENCE_KEY_PREFIX}:*`;
    const userIds: Set<string> = new Set();

    for await (const key of this.redis.scanIterator({ MATCH: pattern })) {
      const userId = key.substring(this.PRESENCE_KEY_PREFIX.length + 1); // +1 for the colon
      userIds.add(userId);
    }
    return Array.from(userIds);
  }

  async addSubscriber(userId: string, subscriberId: string): Promise<void> {
    const key = this.getSubscriptionKey(userId);
    await this.redis.sAdd(key, subscriberId);
  }

  async removeSubscriber(userId: string, subscriberId: string): Promise<void> {
    const key = this.getSubscriptionKey(userId);
    await this.redis.sRem(key, subscriberId);
  }

  async getSubscribers(userId: string): Promise<string[]> {
    const key = this.getSubscriptionKey(userId);
    return this.redis.sMembers(key);
  }
}
