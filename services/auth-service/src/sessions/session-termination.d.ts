/**
 * Session Termination
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Handles session termination with cleanup and event emission
 */
import { SessionStore } from './session-store';
import { RevocationService } from '../revocation/revocation-service';
import { RevocationReason } from '../revocation/types';
export declare class SessionTermination {
    private sessionStore;
    private revocationService;
    constructor(sessionStore: SessionStore, revocationService: RevocationService);
    /**
     * Terminate single session
     */
    terminateSession(sessionId: string, reason?: RevocationReason): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Terminate all user sessions
     */
    terminateAllSessions(userId: string, reason?: RevocationReason): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Terminate all sessions except current
     */
    terminateOtherSessions(userId: string, currentSessionId: string, reason?: RevocationReason): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Terminate sessions by device
     */
    terminateDeviceSessions(userId: string, deviceId: string, reason?: RevocationReason): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Terminate idle sessions
     */
    terminateIdleSessions(userId: string, idleThresholdMs?: number): Promise<{
        success: boolean;
        count: number;
    }>;
    /**
     * Terminate expired sessions
     */
    terminateExpiredSessions(userId: string): Promise<{
        success: boolean;
        count: number;
    }>;
}
