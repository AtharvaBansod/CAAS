/**
 * Concurrent Session Handler
 * Phase 2 - Authentication - Task AUTH-008
 * 
 * Handles concurrent session policies
 */

import { Session } from '../types';
import { SessionStore } from '../session-store';
import { ConcurrentSessionPolicy, SessionLimitAction } from './types';

export class ConcurrentSessionHandler {
  constructor(
    private sessionStore: SessionStore,
    private policy: ConcurrentSessionPolicy,
    private maxSessions: number,
    private limitAction: SessionLimitAction
  ) {}

  /**
   * Check if new session is allowed
   */
  async canCreateSession(
    userId: string,
    deviceType: string
  ): Promise<{ allowed: boolean; reason?: string; sessionToRemove?: string }> {
    const sessions = await this.sessionStore.getUserSessions(userId);

    switch (this.policy) {
      case ConcurrentSessionPolicy.ALLOW_ALL:
        return { allowed: true };

      case ConcurrentSessionPolicy.LIMIT:
        return this.checkLimit(sessions);

      case ConcurrentSessionPolicy.EXCLUSIVE:
        return this.checkExclusive(sessions);

      case ConcurrentSessionPolicy.DEVICE_EXCLUSIVE:
        return this.checkDeviceExclusive(sessions, deviceType);

      default:
        return { allowed: true };
    }
  }

  /**
   * Check session limit
   */
  private checkLimit(
    sessions: Session[]
  ): { allowed: boolean; reason?: string; sessionToRemove?: string } {
    if (sessions.length < this.maxSessions) {
      return { allowed: true };
    }

    switch (this.limitAction) {
      case SessionLimitAction.REJECT:
        return {
          allowed: false,
          reason: `Maximum concurrent sessions (${this.maxSessions}) reached`,
        };

      case SessionLimitAction.REMOVE_OLDEST:
        const oldest = this.findOldestSession(sessions);
        return {
          allowed: true,
          sessionToRemove: oldest?.id,
        };

      case SessionLimitAction.REMOVE_LEAST_ACTIVE:
        const leastActive = this.findLeastActiveSession(sessions);
        return {
          allowed: true,
          sessionToRemove: leastActive?.id,
        };

      default:
        return { allowed: false, reason: 'Session limit reached' };
    }
  }

  /**
   * Check exclusive policy (only one session allowed)
   */
  private checkExclusive(
    sessions: Session[]
  ): { allowed: boolean; reason?: string; sessionToRemove?: string } {
    if (sessions.length === 0) {
      return { allowed: true };
    }

    // Remove existing session
    return {
      allowed: true,
      sessionToRemove: sessions[0].id,
    };
  }

  /**
   * Check device exclusive policy (one session per device type)
   */
  private checkDeviceExclusive(
    sessions: Session[],
    deviceType: string
  ): { allowed: boolean; reason?: string; sessionToRemove?: string } {
    const existingDeviceSession = sessions.find(
      s => s.device_info.type === deviceType
    );

    if (!existingDeviceSession) {
      return { allowed: true };
    }

    // Remove existing session for this device type
    return {
      allowed: true,
      sessionToRemove: existingDeviceSession.id,
    };
  }

  /**
   * Find oldest session
   */
  private findOldestSession(sessions: Session[]): Session | undefined {
    if (sessions.length === 0) return undefined;

    return sessions.reduce((oldest, current) =>
      current.created_at < oldest.created_at ? current : oldest
    );
  }

  /**
   * Find least active session
   */
  private findLeastActiveSession(sessions: Session[]): Session | undefined {
    if (sessions.length === 0) return undefined;

    return sessions.reduce((leastActive, current) =>
      current.last_activity < leastActive.last_activity ? current : leastActive
    );
  }

  /**
   * Get policy configuration
   */
  getPolicy(): {
    policy: ConcurrentSessionPolicy;
    maxSessions: number;
    limitAction: SessionLimitAction;
  } {
    return {
      policy: this.policy,
      maxSessions: this.maxSessions,
      limitAction: this.limitAction,
    };
  }

  /**
   * Update policy
   */
  updatePolicy(
    policy?: ConcurrentSessionPolicy,
    maxSessions?: number,
    limitAction?: SessionLimitAction
  ): void {
    if (policy) this.policy = policy;
    if (maxSessions) this.maxSessions = maxSessions;
    if (limitAction) this.limitAction = limitAction;
  }
}
