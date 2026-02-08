/**
 * Key Access Control
 * Enforces access control and auditing for key operations
 */

import { KeyAccessLog } from './types';

export class KeyAccessControl {
  private accessLogs: KeyAccessLog[] = [];
  private rateLimitMap: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_WINDOW = 100;

  /**
   * Check if user can access key
   */
  async canAccessKey(
    userId: string,
    keyUserId: string,
    tenantId: string,
    keyTenantId: string
  ): Promise<boolean> {
    // Users can only access their own keys
    if (userId !== keyUserId) {
      return false;
    }

    // Keys must be in the same tenant
    if (tenantId !== keyTenantId) {
      return false;
    }

    return true;
  }

  /**
   * Check rate limit for key retrieval
   */
  async checkRateLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const userKey = `user:${userId}`;

    // Get user's request timestamps
    let timestamps = this.rateLimitMap.get(userKey) || [];

    // Remove old timestamps outside the window
    timestamps = timestamps.filter(ts => now - ts < this.RATE_LIMIT_WINDOW);

    // Check if limit exceeded
    if (timestamps.length >= this.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimitMap.set(userKey, timestamps);

    return true;
  }

  /**
   * Log key access
   */
  async logAccess(log: KeyAccessLog): Promise<void> {
    this.accessLogs.push(log);

    // In production, persist to database
    // await this.persistLog(log);
  }

  /**
   * Audit key access for user
   */
  async auditUserAccess(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<KeyAccessLog[]> {
    let logs = this.accessLogs.filter(log => log.user_id === userId);

    if (startDate) {
      logs = logs.filter(log => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter(log => log.timestamp <= endDate);
    }

    return logs;
  }

  /**
   * Audit key access for specific key
   */
  async auditKeyAccess(keyId: string): Promise<KeyAccessLog[]> {
    return this.accessLogs.filter(log => log.key_id === keyId);
  }

  /**
   * Check for suspicious access patterns
   */
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    const recentLogs = await this.auditUserAccess(
      userId,
      new Date(Date.now() - 3600000) // Last hour
    );

    // Check for excessive access
    if (recentLogs.length > 500) {
      return true;
    }

    // Check for access from multiple IPs
    const uniqueIPs = new Set(
      recentLogs.map(log => log.ip_address).filter(Boolean)
    );
    if (uniqueIPs.size > 10) {
      return true;
    }

    return false;
  }

  /**
   * Validate access context
   */
  async validateAccessContext(
    userId: string,
    tenantId: string,
    ipAddress?: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check rate limit
    const withinLimit = await this.checkRateLimit(userId);
    if (!withinLimit) {
      return {
        valid: false,
        reason: 'Rate limit exceeded',
      };
    }

    // Check for suspicious activity
    const suspicious = await this.detectSuspiciousActivity(userId);
    if (suspicious) {
      return {
        valid: false,
        reason: 'Suspicious activity detected',
      };
    }

    return { valid: true };
  }

  /**
   * Clear rate limit for user (for testing)
   */
  clearRateLimit(userId: string): void {
    this.rateLimitMap.delete(`user:${userId}`);
  }

  /**
   * Get access statistics
   */
  async getAccessStats(userId: string): Promise<{
    total_accesses: number;
    last_access?: Date;
    access_by_action: Record<string, number>;
  }> {
    const logs = await this.auditUserAccess(userId);

    const accessByAction: Record<string, number> = {};
    logs.forEach(log => {
      accessByAction[log.action] = (accessByAction[log.action] || 0) + 1;
    });

    return {
      total_accesses: logs.length,
      last_access: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined,
      access_by_action: accessByAction,
    };
  }
}

export const keyAccessControl = new KeyAccessControl();
