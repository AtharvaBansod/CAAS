/**
 * Session Manager
 * Manages Signal Protocol session lifecycle
 */

import { sessionBuilder } from './signal/session-builder';
import { sessionStore } from './signal/session-store';
import { keyServer } from '../distribution/key-server';
import { Session } from './signal/types';

export class SessionManager {
  /**
   * Get or create session
   */
  async getOrCreateSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<Session> {
    // Check if session exists
    const existingSession = await sessionStore.loadSession(
      userId,
      recipientId,
      deviceId
    );

    if (existingSession) {
      return existingSession;
    }

    // Create new session
    return this.createSession(userId, recipientId, deviceId);
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<Session> {
    // Get recipient's pre-key bundle
    const bundle = await keyServer.getPreKeyBundle(recipientId, deviceId);

    if (!bundle) {
      throw new Error('Pre-key bundle not available for recipient');
    }

    // Build outgoing session
    return sessionBuilder.buildOutgoingSession(userId, recipientId, bundle);
  }

  /**
   * Check if session exists
   */
  async hasSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<boolean> {
    return sessionStore.hasSession(userId, recipientId, deviceId);
  }

  /**
   * Delete session
   */
  async deleteSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<void> {
    await sessionStore.deleteSession(userId, recipientId, deviceId);
  }

  /**
   * Delete all sessions with recipient
   */
  async deleteAllSessions(
    userId: string,
    recipientId: string
  ): Promise<number> {
    const sessions = await sessionStore.getRecipientSessions(
      userId,
      recipientId
    );

    for (const session of sessions) {
      await sessionStore.deleteSession(
        userId,
        recipientId,
        session.device_id
      );
    }

    return sessions.length;
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return sessionStore.getUserSessions(userId);
  }

  /**
   * Get sessions with recipient
   */
  async getRecipientSessions(
    userId: string,
    recipientId: string
  ): Promise<Session[]> {
    return sessionStore.getRecipientSessions(userId, recipientId);
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions(daysOld: number = 90): Promise<number> {
    return sessionStore.cleanupOldSessions(daysOld);
  }

  /**
   * Handle session not found error
   */
  async handleSessionNotFound(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<Session> {
    // Try to create new session
    try {
      return await this.createSession(userId, recipientId, deviceId);
    } catch (error) {
      throw new Error(
        `Cannot establish session with ${recipientId}:${deviceId}: ${
          (error as Error).message
        }`
      );
    }
  }

  /**
   * Refresh session (re-establish)
   */
  async refreshSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<Session> {
    // Delete old session
    await this.deleteSession(userId, recipientId, deviceId);

    // Create new session
    return this.createSession(userId, recipientId, deviceId);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string): Promise<{
    total_sessions: number;
    active_recipients: number;
    oldest_session?: Date;
    newest_session?: Date;
  }> {
    const sessions = await this.getUserSessions(userId);

    const recipients = new Set(sessions.map(s => s.recipient_id));

    let oldest: Date | undefined;
    let newest: Date | undefined;

    for (const session of sessions) {
      if (!oldest || session.created_at < oldest) {
        oldest = session.created_at;
      }
      if (!newest || session.created_at > newest) {
        newest = session.created_at;
      }
    }

    return {
      total_sessions: sessions.length,
      active_recipients: recipients.size,
      oldest_session: oldest,
      newest_session: newest,
    };
  }
}

export const sessionManager = new SessionManager();
