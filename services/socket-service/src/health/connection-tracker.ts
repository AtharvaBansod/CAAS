import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('ConnectionTracker');

export interface ConnectionInfo {
  socket_id: string;
  user_id: string;
  tenant_id: string;
  connected_at: Date;
  namespace?: string;
}

export class ConnectionTracker {
  private readonly keyPrefix = 'socket:connections';
  private readonly tenantKeyPrefix = 'socket:tenant:connections';

  constructor(private redis: RedisClientType) {}

  async addConnection(info: ConnectionInfo): Promise<void> {
    try {
      const key = `${this.keyPrefix}:${info.socket_id}`;
      const tenantKey = `${this.tenantKeyPrefix}:${info.tenant_id}`;

      await Promise.all([
        this.redis.hSet(key, {
          socket_id: info.socket_id,
          user_id: info.user_id,
          tenant_id: info.tenant_id,
          connected_at: info.connected_at.toISOString(),
          namespace: info.namespace || 'default',
        }),
        this.redis.expire(key, 3600), // 1 hour TTL
        this.redis.sAdd(tenantKey, info.socket_id),
        this.redis.expire(tenantKey, 3600),
      ]);

      logger.debug(`Connection tracked: ${info.socket_id} for user ${info.user_id}`);
    } catch (error: any) {
      logger.error('Failed to track connection', error);
    }
  }

  async removeConnection(socketId: string, tenantId?: string): Promise<void> {
    try {
      const key = `${this.keyPrefix}:${socketId}`;

      if (tenantId) {
        const tenantKey = `${this.tenantKeyPrefix}:${tenantId}`;
        await this.redis.sRem(tenantKey, socketId);
      }

      await this.redis.del(key);
      logger.debug(`Connection removed: ${socketId}`);
    } catch (error: any) {
      logger.error('Failed to remove connection', error);
    }
  }

  async getConnection(socketId: string): Promise<ConnectionInfo | null> {
    try {
      const key = `${this.keyPrefix}:${socketId}`;
      const data = await this.redis.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        socket_id: data.socket_id,
        user_id: data.user_id,
        tenant_id: data.tenant_id,
        connected_at: new Date(data.connected_at),
        namespace: data.namespace,
      };
    } catch (error: any) {
      logger.error('Failed to get connection', error);
      return null;
    }
  }

  async getTenantConnectionCount(tenantId: string): Promise<number> {
    try {
      const tenantKey = `${this.tenantKeyPrefix}:${tenantId}`;
      return await this.redis.sCard(tenantKey);
    } catch (error: any) {
      logger.error('Failed to get tenant connection count', error);
      return 0;
    }
  }

  async getTotalConnectionCount(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}:*`);
      return keys.length;
    } catch (error: any) {
      logger.error('Failed to get total connection count', error);
      return 0;
    }
  }

  async checkConnectionLimit(tenantId: string, maxConnections: number): Promise<boolean> {
    const count = await this.getTenantConnectionCount(tenantId);
    return count < maxConnections;
  }
}
