/**
 * Session Service
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Main service for session lifecycle management
 */
import { SessionStore } from './session-store';
import { ValidationOptions } from './session-validator';
import { RenewalPolicy } from './session-renewal';
import { SessionTermination } from './session-termination';
import { Session, CreateSessionParams, SessionValidation, SessionConfig } from './types';
export declare class SessionService {
    private sessionStore;
    private config;
    private validator;
    private renewal;
    private termination;
    constructor(sessionStore: SessionStore, config: SessionConfig, renewalPolicy: RenewalPolicy, termination: SessionTermination);
    /**
     * Create new session
     */
    createSession(params: CreateSessionParams): Promise<Session>;
    /**
     * Validate session
     */
    validateSession(sessionId: string, options?: ValidationOptions): Promise<SessionValidation>;
    /**
     * Renew session
     */
    renewSession(sessionId: string): Promise<Session>;
    /**
     * Terminate session
     */
    terminateSession(sessionId: string): Promise<void>;
    /**
     * Terminate all user sessions
     */
    terminateAllSessions(userId: string, exceptSessionId?: string): Promise<number>;
    /**
     * Get user sessions
     */
    getUserSessions(userId: string): Promise<Session[]>;
    /**
     * Get session
     */
    getSession(sessionId: string): Promise<Session | null>;
    /**
     * Update session MFA status
     */
    markMfaVerified(sessionId: string): Promise<void>;
    /**
     * Get session health score
     */
    getSessionHealth(sessionId: string): Promise<number>;
    private removeOldestSession;
    private maskIp;
}
