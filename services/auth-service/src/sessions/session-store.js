"use strict";
/**
 * Session Store
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Redis-based session storage with efficient lookup and automatic cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = void 0;
const crypto_1 = require("crypto");
const types_1 = require("./types");
const session_serializer_1 = require("./session-serializer");
class SessionStore {
    redis;
    config;
    constructor(redis, config = {}) {
        this.redis = redis;
        this.config = { ...types_1.defaultSessionConfig, ...config };
    }
    /**
     * Create new session
     */
    async create(data) {
        const sessionId = (0, crypto_1.randomUUID)();
        const now = Date.now();
        const session = {
            id: sessionId,
            user_id: data.user_id,
            tenant_id: data.tenant_id,
            device_id: data.device_id,
            device_info: data.device_info,
            ip_address: data.ip_address,
            location: data.location,
            created_at: now,
            last_activity: now,
            expires_at: now + this.config.ttl_seconds * 1000,
            is_active: true,
            mfa_verified: data.mfa_verified || false,
        };
        // Store session
        await this.storeSession(session);
        // Add to user's session index
        await this.addToUserIndex(data.user_id, sessionId);
        return session;
    }
    /**
     * Get session by ID
     */
    async get(sessionId) {
        const key = this.getSessionKey(sessionId);
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return session_serializer_1.SessionSerializer.deserialize(data);
    }
    /**
     * Update session
     */
    async update(sessionId, updates) {
        const session = await this.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Apply updates
        const updatedSession = {
            ...session,
            ...updates,
            id: session.id, // Prevent ID change
            user_id: session.user_id, // Prevent user_id change
            created_at: session.created_at, // Prevent created_at change
        };
        await this.storeSession(updatedSession);
        return updatedSession;
    }
    /**
     * Delete session
     */
    async delete(sessionId) {
        const session = await this.get(sessionId);
        if (!session) {
            return;
        }
        // Remove from Redis
        const key = this.getSessionKey(sessionId);
        await this.redis.del(key);
        // Remove from user index
        await this.removeFromUserIndex(session.user_id, sessionId);
    }
    /**
     * Get all user sessions
     */
    async getUserSessions(userId) {
        const sessionIds = await this.getUserSessionIds(userId);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.get(sessionId);
            if (session) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    /**
     * Delete all user sessions
     */
    async deleteUserSessions(userId) {
        const sessionIds = await this.getUserSessionIds(userId);
        let deletedCount = 0;
        for (const sessionId of sessionIds) {
            await this.delete(sessionId);
            deletedCount++;
        }
        return deletedCount;
    }
    /**
     * Update last activity
     */
    async updateLastActivity(sessionId) {
        const session = await this.get(sessionId);
        if (!session) {
            return;
        }
        session.last_activity = Date.now();
        await this.storeSession(session);
    }
    /**
     * Renew session (extend expiry)
     */
    async renew(sessionId, extensionMs) {
        const session = await this.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        session.expires_at = Date.now() + extensionMs;
        await this.storeSession(session);
        return session;
    }
    /**
     * Mark session as inactive
     */
    async deactivate(sessionId) {
        const session = await this.get(sessionId);
        if (!session) {
            return;
        }
        session.is_active = false;
        await this.storeSession(session);
    }
    /**
     * Cleanup expired sessions
     */
    async cleanupExpiredSessions() {
        // Note: Redis TTL handles automatic cleanup
        // This method is for manual cleanup if needed
        let cleanedCount = 0;
        const pattern = 'session:*';
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
                // No TTL set, remove it
                await this.redis.del(key);
                cleanedCount++;
            }
        }
        return cleanedCount;
    }
    /**
     * Get session count for user
     */
    async getUserSessionCount(userId) {
        const key = this.getUserSessionsKey(userId);
        return await this.redis.scard(key);
    }
    /**
     * Check if session exists
     */
    async exists(sessionId) {
        const key = this.getSessionKey(sessionId);
        return (await this.redis.exists(key)) === 1;
    }
    // Private helper methods
    async storeSession(session) {
        const key = this.getSessionKey(session.id);
        const data = session_serializer_1.SessionSerializer.serialize(session);
        const ttl = Math.ceil((session.expires_at - Date.now()) / 1000);
        if (ttl > 0) {
            await this.redis.setex(key, ttl, data);
        }
    }
    async addToUserIndex(userId, sessionId) {
        const key = this.getUserSessionsKey(userId);
        await this.redis.sadd(key, sessionId);
        await this.redis.expire(key, this.config.ttl_seconds);
    }
    async removeFromUserIndex(userId, sessionId) {
        const key = this.getUserSessionsKey(userId);
        await this.redis.srem(key, sessionId);
    }
    async getUserSessionIds(userId) {
        const key = this.getUserSessionsKey(userId);
        return await this.redis.smembers(key);
    }
    getSessionKey(sessionId) {
        return `session:${sessionId}`;
    }
    getUserSessionsKey(userId) {
        return `user_sessions:${userId}`;
    }
}
exports.SessionStore = SessionStore;
//# sourceMappingURL=session-store.js.map
