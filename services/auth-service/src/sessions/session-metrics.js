"use strict";
/**
 * Session Metrics
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Tracks session-related metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionMetricsCollector = void 0;
class SessionMetricsCollector {
    metrics = {
        active_sessions: 0,
        sessions_by_device: {},
        average_session_duration: 0,
        sessions_per_user: {},
    };
    /**
     * Increment active sessions
     */
    incrementActiveSessions() {
        this.metrics.active_sessions++;
    }
    /**
     * Decrement active sessions
     */
    decrementActiveSessions() {
        this.metrics.active_sessions = Math.max(0, this.metrics.active_sessions - 1);
    }
    /**
     * Track session by device type
     */
    trackDeviceType(deviceType) {
        this.metrics.sessions_by_device[deviceType] =
            (this.metrics.sessions_by_device[deviceType] || 0) + 1;
    }
    /**
     * Track session duration
     */
    trackSessionDuration(durationMs) {
        // Simple moving average
        const currentAvg = this.metrics.average_session_duration;
        const count = this.metrics.active_sessions || 1;
        this.metrics.average_session_duration =
            (currentAvg * (count - 1) + durationMs) / count;
    }
    /**
     * Track sessions per user
     */
    trackUserSession(userId, increment = true) {
        if (increment) {
            this.metrics.sessions_per_user[userId] =
                (this.metrics.sessions_per_user[userId] || 0) + 1;
        }
        else {
            this.metrics.sessions_per_user[userId] = Math.max(0, (this.metrics.sessions_per_user[userId] || 0) - 1);
        }
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics
     */
    reset() {
        this.metrics = {
            active_sessions: 0,
            sessions_by_device: {},
            average_session_duration: 0,
            sessions_per_user: {},
        };
    }
    /**
     * Get metrics summary
     */
    getSummary() {
        const deviceTypes = Object.entries(this.metrics.sessions_by_device)
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ');
        return `Active Sessions: ${this.metrics.active_sessions}, ` +
            `By Device: {${deviceTypes}}, ` +
            `Avg Duration: ${Math.round(this.metrics.average_session_duration / 1000)}s`;
    }
}
exports.SessionMetricsCollector = SessionMetricsCollector;
//# sourceMappingURL=session-metrics.js.map