/**
 * Session Store
 * Phase 2 - Authentication - Task AUTH-005
 * 
 * Redis-based session storage with efficient lookup and automatic cleanup
 */

import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { Session, SessionData, SessionConfig, defaultSessionConfig } from './types';
import { SessionSerializer } from './session-serializer';

export class SessionStore {
  private redis: Redis;
  private config: SessionConfig;

  constructor(redis: Redis, config: Partial<SessionConfig> = {}) {
    this.redis = redis;
    this.config = { ...defaultSessionConfig, ...config };
  }

  /**
   * Create new session
   */
  async create(data: SessionData): Promise<Session> {
    const sessionId = randomUUID();
    const now = Date.now();

    const session: Session = {
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
  async get(sessionId: string): Promise<Session | null> {
    const key = this.getSessionKey(sessionId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return SessionSerializer.deserialize(data);
  }

  /**
   * Update session
   */
  async update(sessionId: string, updates: Partial<SessionData>): Promise<Session> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Apply updates
    const updatedSession: Session = {
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
  async delete(sessionId: string): Promise<void> {
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
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = await this.getUserSessionIds(userId);
    const sessions: Session[] = [];

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
  async deleteUserSessions(userId: string): Promise<number> {
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
  async updateLastActivity(sessionId: string): Promise<void> {
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
  async renew(sessionId: string, extensionMs: number): Promise<Session> {
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
  async deactivate(sessionId: string): Promise<void> {
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
  async cleanupExpiredSessions(): Promise<number> {
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
  async getUserSessionCount(userId: string): Promise<number> {
    const key = this.getUserSessionsKey(userId);
    return await this.redis.scard(key);
  }

  /**
   * Check if session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const key = this.getSessionKey(sessionId);
    return (await this.redis.exists(key)) === 1;
  }

  // Private helper methods

  private async storeSession(session: Session): Promise<void> {
    const key = this.getSessionKey(session.id);
    const data = SessionSerializer.serialize(session);
    const ttl = Math.ceil((session.expires_at - Date.now()) / 1000);

    if (ttl > 0) {
      await this.redis.setex(key, ttl, data);
    }
  }

  private async addToUserIndex(userId: string, sessionId: string): Promise<void> {
    const key = this.getUserSessionsKey(userId);
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, this.config.ttl_seconds);
  }

  private async removeFromUserIndex(userId: string, sessionId: string): Promise<void> {
    const key = this.getUserSessionsKey(userId);
    await this.redis.srem(key, sessionId);
  }

  private async getUserSessionIds(userId: string): Promise<string[]> {
    const key = this.getUserSessionsKey(userId);
    return await this.redis.smembers(key);
  }

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }
}
