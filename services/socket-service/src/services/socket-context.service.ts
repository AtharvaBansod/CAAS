/**
 * Socket Context Service
 * Phase 4.5.z.x - Task 03.4: Redis Context Cache
 * 
 * Manages socket connection context in Redis for fast access
 * without re-validating tokens on every message
 */

import { Redis } from 'ioredis';

export interface SocketContext {
    socket_id: string;
    user_id: string;
    tenant_id: string;
    external_id?: string;
    permissions: string[];
    session_id: string;
    connected_at: string;
    last_activity: string;
    instance_id: string;
}

const SOCKET_TTL = 86400; // 24 hours
const USER_SOCKETS_TTL = 86400;

export class SocketContextService {
    private redis: Redis;

    constructor(redisUrl: string) {
        this.redis = new Redis(redisUrl);
    }

    /**
     * Store socket context in Redis
     * Also maintains a reverse mapping: user:{userId} -> Set of socket IDs
     */
    async storeContext(socketId: string, context: SocketContext): Promise<void> {
        const key = `socket:${socketId}`;
        const userKey = `user:sockets:${context.user_id}`;
        const tenantKey = `tenant:sockets:${context.tenant_id}`;

        const pipeline = this.redis.pipeline();

        // Store socket context
        pipeline.setex(key, SOCKET_TTL, JSON.stringify(context));

        // Add to user's socket set
        pipeline.sadd(userKey, socketId);
        pipeline.expire(userKey, USER_SOCKETS_TTL);

        // Add to tenant's socket set
        pipeline.sadd(tenantKey, socketId);
        pipeline.expire(tenantKey, USER_SOCKETS_TTL);

        await pipeline.exec();
    }

    /**
     * Retrieve socket context from Redis
     */
    async getContext(socketId: string): Promise<SocketContext | null> {
        const key = `socket:${socketId}`;
        const data = await this.redis.get(key);
        if (!data) return null;

        try {
            return JSON.parse(data) as SocketContext;
        } catch {
            return null;
        }
    }

    /**
     * Update last activity timestamp and extend TTL
     */
    async updateActivity(socketId: string): Promise<void> {
        const context = await this.getContext(socketId);
        if (!context) return;

        context.last_activity = new Date().toISOString();

        const key = `socket:${socketId}`;
        await this.redis.setex(key, SOCKET_TTL, JSON.stringify(context));
    }

    /**
     * Remove socket context on disconnect
     * Cleans up both the context and reverse mappings
     */
    async removeContext(socketId: string): Promise<void> {
        const context = await this.getContext(socketId);
        if (!context) {
            // Just try to delete the key anyway
            await this.redis.del(`socket:${socketId}`);
            return;
        }

        const pipeline = this.redis.pipeline();

        // Remove socket context
        pipeline.del(`socket:${socketId}`);

        // Remove from user's socket set
        pipeline.srem(`user:sockets:${context.user_id}`, socketId);

        // Remove from tenant's socket set
        pipeline.srem(`tenant:sockets:${context.tenant_id}`, socketId);

        await pipeline.exec();
    }

    /**
     * Get all socket IDs for a user (across all instances)
     */
    async getUserSockets(userId: string): Promise<string[]> {
        const userKey = `user:sockets:${userId}`;
        return this.redis.smembers(userKey);
    }

    /**
     * Get all socket IDs for a tenant
     */
    async getTenantSockets(tenantId: string): Promise<string[]> {
        const tenantKey = `tenant:sockets:${tenantId}`;
        return this.redis.smembers(tenantKey);
    }

    /**
     * Check if a user has any active sockets
     */
    async isUserConnected(userId: string): Promise<boolean> {
        const sockets = await this.getUserSockets(userId);
        return sockets.length > 0;
    }

    /**
     * Clean up stale socket entries (sockets that no longer exist)
     */
    async cleanupStaleEntries(userId: string): Promise<void> {
        const sockets = await this.getUserSockets(userId);
        const pipeline = this.redis.pipeline();

        for (const socketId of sockets) {
            const exists = await this.redis.exists(`socket:${socketId}`);
            if (!exists) {
                pipeline.srem(`user:sockets:${userId}`, socketId);
            }
        }

        await pipeline.exec();
    }

    /**
     * Disconnect and clean up Redis connection
     */
    async disconnect(): Promise<void> {
        await this.redis.quit();
    }
}
