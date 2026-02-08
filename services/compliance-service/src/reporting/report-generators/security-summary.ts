/**
 * Security Summary Report Generator
 */

import { Db } from 'mongodb';
import { ReportOptions, SecuritySummaryData } from '../types';

export class SecuritySummaryGenerator {
  constructor(private db: Db) {}

  async generate(options: ReportOptions): Promise<SecuritySummaryData> {
    const { start_date, end_date, tenant_id } = options;

    const [authentication, authorization, apiUsage, securityEvents] = await Promise.all([
      this.getAuthenticationStats(start_date, end_date, tenant_id),
      this.getAuthorizationStats(start_date, end_date, tenant_id),
      this.getAPIUsageStats(start_date, end_date, tenant_id),
      this.getSecurityEvents(start_date, end_date, tenant_id),
    ]);

    return {
      authentication,
      authorization,
      api_usage: apiUsage,
      security_events: securityEvents,
    };
  }

  private async getAuthenticationStats(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      event_type: { $regex: '^authentication\\.' },
      timestamp: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const auditLogs = await this.db
      .collection('security_audit_logs')
      .find(query)
      .toArray();

    const totalAttempts = auditLogs.length;
    const successfulLogins = auditLogs.filter(
      (log) => log.action === 'login' && log.result === 'success'
    ).length;
    const failedLogins = auditLogs.filter(
      (log) => log.action === 'login' && log.result === 'failure'
    ).length;

    // Get MFA statistics
    const userQuery: any = {};
    if (tenantId) {
      userQuery.tenant_id = tenantId;
    }
    const mfaEnabledUsers = await this.db
      .collection('users')
      .countDocuments({ ...userQuery, mfa_enabled: true });

    return {
      total_attempts: totalAttempts,
      successful_logins: successfulLogins,
      failed_logins: failedLogins,
      mfa_enabled_users: mfaEnabledUsers,
    };
  }

  private async getAuthorizationStats(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      timestamp: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const auditLogs = await this.db
      .collection('authorization_audit_logs')
      .find(query)
      .toArray();

    const totalChecks = auditLogs.length;
    const allowed = auditLogs.filter((log) => log.decision === 'allow').length;
    const denied = auditLogs.filter((log) => log.decision === 'deny').length;

    // Get top denied resources
    const deniedResources = new Map<string, number>();
    for (const log of auditLogs.filter((l) => l.decision === 'deny')) {
      const key = `${log.resource_type}:${log.resource_id}`;
      deniedResources.set(key, (deniedResources.get(key) || 0) + 1);
    }

    const topDeniedResources = Array.from(deniedResources.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    return {
      total_checks: totalChecks,
      allowed,
      denied,
      top_denied_resources: topDeniedResources,
    };
  }

  private async getAPIUsageStats(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      timestamp: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const requests = await this.db
      .collection('api_key_usage')
      .find(query)
      .toArray();

    const totalRequests = requests.length;
    const rateLimited = requests.filter((r) => r.rate_limited).length;

    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    for (const request of requests) {
      const endpoint = request.endpoint || 'unknown';
      byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
    }

    return {
      total_requests: totalRequests,
      by_endpoint: byEndpoint,
      rate_limited: rateLimited,
    };
  }

  private async getSecurityEvents(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      result: 'failure',
      timestamp: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const events = await this.db
      .collection('security_audit_logs')
      .find(query)
      .toArray();

    const total = events.length;

    // Group by event type
    const byType: Record<string, number> = {};
    for (const event of events) {
      const type = event.event_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total,
      by_type: byType,
    };
  }
}
