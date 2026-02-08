/**
 * Session Termination
 * Phase 2 - Authentication - Task AUTH-006
 * 
 * Handles session termination with cleanup and event emission
 */

import { SessionStore } from './session-store';
import { RevocationService } from '../revocation/revocation-service';
import { RevocationReason } from '../revocation/types';

export class SessionTermination {
  constructor(
    private sessionStore: SessionStore,
    private revocationService: RevocationService
  ) {}

  /**
   * Terminate single session
   */
  async terminateSession(
    sessionId: string,
    reason: RevocationReason = RevocationReason.LOGOUT
  ): Promise<{ success: boolean; message: string }> {
    // Get session
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        success: false,
        message: 'Session not found',
      };
    }

    // Revoke session tokens
    await this.revocationService.revokeSessionTokens(
      sessionId,
      session.user_id,
      7 * 24 * 60 * 60, // 7 days TTL
      reason
    );

    // Delete session
    await this.sessionStore.delete(sessionId);

    return {
      success: true,
      message: 'Session terminated successfully',
    };
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllSessions(
    userId: string,
    reason: RevocationReason = RevocationReason.LOGOUT
  ): Promise<{ success: boolean; count: number }> {
    // Get all user sessions
    const sessions = await this.sessionStore.getUserSessions(userId);

    // Terminate each session
    for (const session of sessions) {
      await this.terminateSession(session.id, reason);
    }

    return {
      success: true,
      count: sessions.length,
    };
  }

  /**
   * Terminate all sessions except current
   */
  async terminateOtherSessions(
    userId: string,
    currentSessionId: string,
    reason: RevocationReason = RevocationReason.LOGOUT
  ): Promise<{ success: boolean; count: number }> {
    // Get all user sessions
    const sessions = await this.sessionStore.getUserSessions(userId);

    // Terminate all except current
    let count = 0;
    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        await this.terminateSession(session.id, reason);
        count++;
      }
    }

    return {
      success: true,
      count,
    };
  }

  /**
   * Terminate sessions by device
   */
  async terminateDeviceSessions(
    userId: string,
    deviceId: string,
    reason: RevocationReason = RevocationReason.DEVICE_REMOVED
  ): Promise<{ success: boolean; count: number }> {
    // Get all user sessions
    const sessions = await this.sessionStore.getUserSessions(userId);

    // Terminate sessions for specific device
    let count = 0;
    for (const session of sessions) {
      if (session.device_id === deviceId) {
        await this.terminateSession(session.id, reason);
        count++;
      }
    }

    return {
      success: true,
      count,
    };
  }

  /**
   * Terminate idle sessions
   */
  async terminateIdleSessions(
    userId: string,
    idleThresholdMs: number = 30 * 60 * 1000 // 30 minutes
  ): Promise<{ success: boolean; count: number }> {
    // Get all user sessions
    const sessions = await this.sessionStore.getUserSessions(userId);
    const now = Date.now();

    // Terminate idle sessions
    let count = 0;
    for (const session of sessions) {
      const timeSinceActivity = now - session.last_activity;
      if (timeSinceActivity > idleThresholdMs) {
        await this.terminateSession(session.id, RevocationReason.SESSION_EXPIRED);
        count++;
      }
    }

    return {
      success: true,
      count,
    };
  }

  /**
   * Terminate expired sessions
   */
  async terminateExpiredSessions(userId: string): Promise<{ success: boolean; count: number }> {
    // Get all user sessions
    const sessions = await this.sessionStore.getUserSessions(userId);
    const now = Date.now();

    // Terminate expired sessions
    let count = 0;
    for (const session of sessions) {
      if (now >= session.expires_at) {
        await this.terminateSession(session.id, RevocationReason.SESSION_EXPIRED);
        count++;
      }
    }

    return {
      success: true,
      count,
    };
  }
}
