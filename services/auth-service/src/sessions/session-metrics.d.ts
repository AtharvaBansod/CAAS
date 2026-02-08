/**
 * Session Metrics
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Tracks session-related metrics
 */
export interface SessionMetrics {
    active_sessions: number;
    sessions_by_device: Record<string, number>;
    average_session_duration: number;
    sessions_per_user: Record<string, number>;
}
export declare class SessionMetricsCollector {
    private metrics;
    /**
     * Increment active sessions
     */
    incrementActiveSessions(): void;
    /**
     * Decrement active sessions
     */
    decrementActiveSessions(): void;
    /**
     * Track session by device type
     */
    trackDeviceType(deviceType: string): void;
    /**
     * Track session duration
     */
    trackSessionDuration(durationMs: number): void;
    /**
     * Track sessions per user
     */
    trackUserSession(userId: string, increment?: boolean): void;
    /**
     * Get current metrics
     */
    getMetrics(): SessionMetrics;
    /**
     * Reset metrics
     */
    reset(): void;
    /**
     * Get metrics summary
     */
    getSummary(): string;
}
