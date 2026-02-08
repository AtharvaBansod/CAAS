/**
 * Session Store
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Redis-based session storage with efficient lookup and automatic cleanup
 */
import Redis from 'ioredis';
import { Session, SessionData, SessionConfig } from './types';
export declare class SessionStore {
    private redis;
    private config;
    constructor(redis: Redis, config?: Partial<SessionConfig>);
    /**
     * Create new session
     */
    create(data: SessionData): Promise<Session>;
    /**
     * Get session by ID
     */
    get(sessionId: string): Promise<Session | null>;
    /**
     * Update session
     */
    update(sessionId: string, updates: Partial<SessionData>): Promise<Session>;
    /**
     * Delete session
     */
    delete(sessionId: string): Promise<void>;
    /**
     * Get all user sessions
     */
    getUserSessions(userId: string): Promise<Session[]>;
    /**
     * Delete all user sessions
     */
    deleteUserSessions(userId: string): Promise<number>;
    /**
     * Update last activity
     */
    updateLastActivity(sessionId: string): Promise<void>;
    /**
     * Renew session (extend expiry)
     */
    renew(sessionId: string, extensionMs: number): Promise<Session>;
    /**
     * Mark session as inactive
     */
    deactivate(sessionId: string): Promise<void>;
    /**
     * Cleanup expired sessions
     */
    cleanupExpiredSessions(): Promise<number>;
    /**
     * Get session count for user
     */
    getUserSessionCount(userId: string): Promise<number>;
    /**
     * Check if session exists
     */
    exists(sessionId: string): Promise<boolean>;
    private storeSession;
    private addToUserIndex;
    private removeFromUserIndex;
    private getUserSessionIds;
    private getSessionKey;
    private getUserSessionsKey;
}
