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

export class SessionMetricsCollector {
  private metrics: SessionMetrics = {
    active_sessions: 0,
    sessions_by_device: {},
    average_session_duration: 0,
    sessions_per_user: {},
  };

  /**
   * Increment active sessions
   */
  incrementActiveSessions(): void {
    this.metrics.active_sessions++;
  }

  /**
   * Decrement active sessions
   */
  decrementActiveSessions(): void {
    this.metrics.active_sessions = Math.max(0, this.metrics.active_sessions - 1);
  }

  /**
   * Track session by device type
   */
  trackDeviceType(deviceType: string): void {
    this.metrics.sessions_by_device[deviceType] =
      (this.metrics.sessions_by_device[deviceType] || 0) + 1;
  }

  /**
   * Track session duration
   */
  trackSessionDuration(durationMs: number): void {
    // Simple moving average
    const currentAvg = this.metrics.average_session_duration;
    const count = this.metrics.active_sessions || 1;
    this.metrics.average_session_duration =
      (currentAvg * (count - 1) + durationMs) / count;
  }

  /**
   * Track sessions per user
   */
  trackUserSession(userId: string, increment: boolean = true): void {
    if (increment) {
      this.metrics.sessions_per_user[userId] =
        (this.metrics.sessions_per_user[userId] || 0) + 1;
    } else {
      this.metrics.sessions_per_user[userId] = Math.max(
        0,
        (this.metrics.sessions_per_user[userId] || 0) - 1
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SessionMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  reset(): void {
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
  getSummary(): string {
    const deviceTypes = Object.entries(this.metrics.sessions_by_device)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    return `Active Sessions: ${this.metrics.active_sessions}, ` +
           `By Device: {${deviceTypes}}, ` +
           `Avg Duration: ${Math.round(this.metrics.average_session_duration / 1000)}s`;
  }
}
