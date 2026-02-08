/**
 * Session Service
 * Phase 2 - Authentication - Task AUTH-006
 * 
 * Main service for session lifecycle management
 */

import { randomUUID } from 'crypto';
import { SessionStore } from './session-store';
import { SessionValidator, ValidationOptions } from './session-validator';
import { SessionRenewal, RenewalPolicy } from './session-renewal';
import { SessionTermination } from './session-termination';
import { DeviceFingerprint } from './device-fingerprint';
import { Session, CreateSessionParams, SessionValidation, SessionConfig } from './types';

export class SessionService {
  private validator: SessionValidator;
  private renewal: SessionRenewal;
  private termination: SessionTermination;

  constructor(
    private sessionStore: SessionStore,
    private config: SessionConfig,
    renewalPolicy: RenewalPolicy,
    termination: SessionTermination
  ) {
    this.validator = new SessionValidator();
    this.renewal = new SessionRenewal(sessionStore, renewalPolicy);
    this.termination = termination;
  }

  /**
   * Create new session
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    // Check session limit
    const currentCount = await this.sessionStore.getUserSessionCount(params.user_id);
    if (currentCount >= this.config.max_sessions_per_user) {
      // Remove oldest session
      await this.removeOldestSession(params.user_id);
    }

    // Generate device ID if not provided
    const deviceId = params.device_id || randomUUID();

    // Create session
    const session = await this.sessionStore.create({
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      device_id: deviceId,
      device_info: params.device_info,
      ip_address: params.ip_address,
      location: params.location,
    });

    console.log('Session created:', {
      session_id: session.id,
      user_id: session.user_id,
      device_type: session.device_info.type,
      ip: this.maskIp(session.ip_address),
    });

    return session;
  }

  /**
   * Validate session
   */
  async validateSession(
    sessionId: string,
    options?: ValidationOptions
  ): Promise<SessionValidation> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return {
        valid: false,
        reason: 'Session not found',
      };
    }

    // Validate session
    const validation = await this.validator.validate(session, options);

    // Update last activity if valid
    if (validation.valid) {
      await this.sessionStore.updateLastActivity(sessionId);
    }

    return validation;
  }

  /**
   * Renew session
   */
  async renewSession(sessionId: string): Promise<Session> {
    const result = await this.renewal.renew(sessionId);
    
    if (!result.renewed) {
      throw new Error(`Session renewal failed: ${result.reason}`);
    }

    return result.session!;
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.termination.terminateSession(sessionId);
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    if (exceptSessionId) {
      const result = await this.termination.terminateOtherSessions(userId, exceptSessionId);
      return result.count;
    } else {
      const result = await this.termination.terminateAllSessions(userId);
      return result.count;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    return await this.sessionStore.getUserSessions(userId);
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return await this.sessionStore.get(sessionId);
  }

  /**
   * Update session MFA status
   */
  async markMfaVerified(sessionId: string): Promise<void> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await this.sessionStore.update(sessionId, { mfa_verified: true });
  }

  /**
   * Get session health score
   */
  async getSessionHealth(sessionId: string): Promise<number> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return 0;
    }

    return this.validator.getHealthScore(session);
  }

  // Private helper methods

  private async removeOldestSession(userId: string): Promise<void> {
    const sessions = await this.sessionStore.getUserSessions(userId);
    if (sessions.length === 0) {
      return;
    }

    // Find oldest session
    const oldest = sessions.reduce((prev, current) =>
      prev.created_at < current.created_at ? prev : current
    );

    await this.sessionStore.delete(oldest.id);
  }

  private maskIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }
}
