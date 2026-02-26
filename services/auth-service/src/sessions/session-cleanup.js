"use strict";
/**
 * Session Cleanup
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Background job for cleaning up expired sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionCleanup = void 0;
class SessionCleanup {
    sessionStore;
    metricsCollector;
    intervalMs;
    intervalId;
    isRunning = false;
    constructor(sessionStore, metricsCollector, intervalMs = 5 * 60 * 1000 // 5 minutes
    ) {
        this.sessionStore = sessionStore;
        this.metricsCollector = metricsCollector;
        this.intervalMs = intervalMs;
    }
    /**
     * Start cleanup job
     */
    start() {
        if (this.isRunning) {
            console.warn('Session cleanup already running');
            return;
        }
        this.isRunning = true;
        console.log(`Starting session cleanup job (interval: ${this.intervalMs}ms)`);
        // Run immediately
        this.runCleanup();
        // Schedule periodic cleanup
        this.intervalId = setInterval(() => {
            this.runCleanup();
        }, this.intervalMs);
    }
    /**
     * Stop cleanup job
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this.isRunning = false;
        console.log('Session cleanup job stopped');
    }
    /**
     * Run cleanup
     */
    async runCleanup() {
        try {
            const startTime = Date.now();
            console.log('Running session cleanup...');
            // Get all expired sessions
            const expiredCount = await this.sessionStore.cleanupExpiredSessions();
            const duration = Date.now() - startTime;
            console.log(`Session cleanup completed: ${expiredCount} sessions removed in ${duration}ms`);
            // Update metrics
            for (let i = 0; i < expiredCount; i++) {
                this.metricsCollector.decrementActiveSessions();
            }
        }
        catch (error) {
            console.error('Session cleanup failed:', error);
        }
    }
    /**
     * Force cleanup now
     */
    async forceCleanup() {
        return await this.sessionStore.cleanupExpiredSessions();
    }
    /**
     * Check if cleanup is running
     */
    isCleanupRunning() {
        return this.isRunning;
    }
}
exports.SessionCleanup = SessionCleanup;
//# sourceMappingURL=session-cleanup.js.map
