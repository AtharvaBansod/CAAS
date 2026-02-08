/**
 * Session Cleanup
 * Phase 2 - Authentication - Task AUTH-005
 * 
 * Background job for cleaning up expired sessions
 */

import { SessionStore } from './session-store';
import { SessionMetricsCollector } from './session-metrics';

export class SessionCleanup {
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    private sessionStore: SessionStore,
    private metricsCollector: SessionMetricsCollector,
    private intervalMs: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  /**
   * Start cleanup job
   */
  start(): void {
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
  stop(): void {
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
  private async runCleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log('Running session cleanup...');

      // Get all expired sessions
      const expiredCount = await this.sessionStore.cleanupExpiredSessions();

      const duration = Date.now() - startTime;
      console.log(
        `Session cleanup completed: ${expiredCount} sessions removed in ${duration}ms`
      );

      // Update metrics
      for (let i = 0; i < expiredCount; i++) {
        this.metricsCollector.decrementActiveSessions();
      }
    } catch (error) {
      console.error('Session cleanup failed:', error);
    }
  }

  /**
   * Force cleanup now
   */
  async forceCleanup(): Promise<number> {
    return await this.sessionStore.cleanupExpiredSessions();
  }

  /**
   * Check if cleanup is running
   */
  isCleanupRunning(): boolean {
    return this.isRunning;
  }
}
