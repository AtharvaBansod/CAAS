/**
 * Session Renewal
 * Phase 2 - Authentication - Task AUTH-006
 * 
 * Handles session renewal with sliding expiration
 */

import { Session, SessionConfig } from './types';
import { SessionStore } from './session-store';

export interface RenewalPolicy {
  enabled: boolean;
  cooldownMs: number;
  maxLifetimeMs: number;
  renewalThresholdMs: number;
}

export class SessionRenewal {
  private lastRenewalTimes: Map<string, number> = new Map();

  constructor(
    private sessionStore: SessionStore,
    private policy: RenewalPolicy
  ) {}

  /**
   * Renew session if eligible
   */
  async renew(sessionId: string): Promise<{ renewed: boolean; session?: Session; reason?: string }> {
    if (!this.policy.enabled) {
      return { renewed: false, reason: 'Renewal disabled' };
    }

    // Get session
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      return { renewed: false, reason: 'Session not found' };
    }

    // Check cooldown
    if (!this.canRenew(sessionId)) {
      return { renewed: false, reason: 'Renewal cooldown active' };
    }

    // Check maximum lifetime
    const age = Date.now() - session.created_at;
    if (age >= this.policy.maxLifetimeMs) {
      return { renewed: false, reason: 'Maximum session lifetime reached' };
    }

    // Check if renewal is needed
    const timeUntilExpiry = session.expires_at - Date.now();
    if (timeUntilExpiry > this.policy.renewalThresholdMs) {
      return { renewed: false, reason: 'Session does not need renewal yet' };
    }

    // Calculate new expiry (remaining lifetime or default TTL, whichever is less)
    const remainingLifetime = this.policy.maxLifetimeMs - age;
    const defaultTtl = 24 * 60 * 60 * 1000; // 24 hours
    const extensionMs = Math.min(remainingLifetime, defaultTtl);

    // Renew session
    const renewedSession = await this.sessionStore.renew(sessionId, extensionMs);

    // Update last renewal time
    this.lastRenewalTimes.set(sessionId, Date.now());

    return { renewed: true, session: renewedSession };
  }

  /**
   * Check if session can be renewed (cooldown check)
   */
  private canRenew(sessionId: string): boolean {
    const lastRenewal = this.lastRenewalTimes.get(sessionId);
    if (!lastRenewal) {
      return true;
    }

    const timeSinceRenewal = Date.now() - lastRenewal;
    return timeSinceRenewal >= this.policy.cooldownMs;
  }

  /**
   * Force renewal (bypass cooldown)
   */
  async forceRenew(sessionId: string, extensionMs: number): Promise<Session> {
    const session = await this.sessionStore.renew(sessionId, extensionMs);
    this.lastRenewalTimes.set(sessionId, Date.now());
    return session;
  }

  /**
   * Get time until next renewal allowed
   */
  getTimeUntilNextRenewal(sessionId: string): number {
    const lastRenewal = this.lastRenewalTimes.get(sessionId);
    if (!lastRenewal) {
      return 0;
    }

    const timeSinceRenewal = Date.now() - lastRenewal;
    const timeUntilNext = this.policy.cooldownMs - timeSinceRenewal;
    return Math.max(0, timeUntilNext);
  }

  /**
   * Clear renewal history for session
   */
  clearRenewalHistory(sessionId: string): void {
    this.lastRenewalTimes.delete(sessionId);
  }

  /**
   * Get renewal statistics
   */
  getRenewalStats(): {
    trackedSessions: number;
    averageCooldown: number;
  } {
    const now = Date.now();
    let totalCooldown = 0;

    for (const [_, lastRenewal] of this.lastRenewalTimes) {
      totalCooldown += now - lastRenewal;
    }

    return {
      trackedSessions: this.lastRenewalTimes.size,
      averageCooldown: this.lastRenewalTimes.size > 0 
        ? totalCooldown / this.lastRenewalTimes.size 
        : 0,
    };
  }
}
