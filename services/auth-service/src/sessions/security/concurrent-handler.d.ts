/**
 * Concurrent Session Handler
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Handles concurrent session policies
 */
import { SessionStore } from '../session-store';
import { ConcurrentSessionPolicy, SessionLimitAction } from './types';
export declare class ConcurrentSessionHandler {
    private sessionStore;
    private policy;
    private maxSessions;
    private limitAction;
    constructor(sessionStore: SessionStore, policy: ConcurrentSessionPolicy, maxSessions: number, limitAction: SessionLimitAction);
    /**
     * Check if new session is allowed
     */
    canCreateSession(userId: string, deviceType: string): Promise<{
        allowed: boolean;
        reason?: string;
        sessionToRemove?: string;
    }>;
    /**
     * Check session limit
     */
    private checkLimit;
    /**
     * Check exclusive policy (only one session allowed)
     */
    private checkExclusive;
    /**
     * Check device exclusive policy (one session per device type)
     */
    private checkDeviceExclusive;
    /**
     * Find oldest session
     */
    private findOldestSession;
    /**
     * Find least active session
     */
    private findLeastActiveSession;
    /**
     * Get policy configuration
     */
    getPolicy(): {
        policy: ConcurrentSessionPolicy;
        maxSessions: number;
        limitAction: SessionLimitAction;
    };
    /**
     * Update policy
     */
    updatePolicy(policy?: ConcurrentSessionPolicy, maxSessions?: number, limitAction?: SessionLimitAction): void;
}
