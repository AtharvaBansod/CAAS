/**
 * Audit Query Service
 */

import { auditStorage } from './audit-storage';
import { AuditFilter, AuditQueryResult, AuditStats } from './types';

export class AuditQueryService {
  /**
   * Query audit logs
   */
  async query(filter: AuditFilter): Promise<AuditQueryResult> {
    return auditStorage.query(filter);
  }

  /**
   * Get audit statistics
   */
  async getStats(tenantId: string, startDate: Date, endDate: Date): Promise<AuditStats> {
    const result = await auditStorage.query({
      tenant_id: tenantId,
      start_date: startDate,
      end_date: endDate,
      limit: 10000,
    });

    const byEventType: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const entry of result.entries) {
      byEventType[entry.event_type] = (byEventType[entry.event_type] || 0) + 1;
      byResult[entry.result] = (byResult[entry.result] || 0) + 1;
      if (entry.actor.user_id) {
        byActor[entry.actor.user_id] = (byActor[entry.actor.user_id] || 0) + 1;
      }
    }

    return {
      total_events: result.total,
      by_event_type: byEventType,
      by_result: byResult,
      by_actor: byActor,
      time_range: { start: startDate, end: endDate },
    };
  }

  /**
   * Export audit logs
   */
  async export(filter: AuditFilter, format: 'json' | 'csv'): Promise<string> {
    const result = await auditStorage.query({ ...filter, limit: 100000 });

    if (format === 'json') {
      return JSON.stringify(result.entries, null, 2);
    } else {
      // CSV format
      const headers = ['audit_id', 'timestamp', 'event_type', 'actor_user_id', 'action', 'result'];
      const rows = result.entries.map(e => [
        e.audit_id,
        e.timestamp.toISOString(),
        e.event_type,
        e.actor.user_id || '',
        e.action,
        e.result,
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
  }
}

export const auditQueryService = new AuditQueryService();
