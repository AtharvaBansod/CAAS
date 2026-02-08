/**
 * Session Renewal
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Handles session renewal with sliding expiration
 */
import { Session } from './types';
import { SessionStore } from './session-store';
export interface RenewalPolicy {
    enabled: boolean;
    cooldownMs: number;
    maxLifetimeMs: number;
    renewalThresholdMs: number;
}
export declare class SessionRenewal {
    private sessionStore;
    private policy;
    private lastRenewalTimes;
    constructor(sessionStore: SessionStore, policy: RenewalPolicy);
    /**
     * Renew session if eligible
     */
    renew(sessionId: string): Promise<{
        renewed: boolean;
        session?: Session;
        reason?: string;
    }>;
    /**
     * Check if session can be renewed (cooldown check)
     */
    private canRenew;
    /**
     * Force renewal (bypass cooldown)
     */
    forceRenew(sessionId: string, extensionMs: number): Promise<Session>;
    /**
     * Get time until next renewal allowed
     */
    getTimeUntilNextRenewal(sessionId: string): number;
    /**
     * Clear renewal history for session
     */
    clearRenewalHistory(sessionId: string): void;
    /**
     * Get renewal statistics
     */
    getRenewalStats(): {
        trackedSessions: number;
        averageCooldown: number;
    };
}
