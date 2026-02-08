/**
 * Session Cleanup
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Background job for cleaning up expired sessions
 */
import { SessionStore } from './session-store';
import { SessionMetricsCollector } from './session-metrics';
export declare class SessionCleanup {
    private sessionStore;
    private metricsCollector;
    private intervalMs;
    private intervalId?;
    private isRunning;
    constructor(sessionStore: SessionStore, metricsCollector: SessionMetricsCollector, intervalMs?: number);
    /**
     * Start cleanup job
     */
    start(): void;
    /**
     * Stop cleanup job
     */
    stop(): void;
    /**
     * Run cleanup
     */
    private runCleanup;
    /**
     * Force cleanup now
     */
    forceCleanup(): Promise<number>;
    /**
     * Check if cleanup is running
     */
    isCleanupRunning(): boolean;
}
