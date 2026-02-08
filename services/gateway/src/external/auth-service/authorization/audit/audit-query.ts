/**
 * Authorization Audit Query Service
 * 
 * Query and analyze authorization audit logs
 */

import { AuditStorage } from './audit-storage';
import { AuditQueryFilters, AuditQueryResult, AuditStatistics } from './types';

export class AuditQueryService {
  constructor(private storage: AuditStorage) {}

  /**
   * Query audit logs
   */
  async query(
    filters: AuditQueryFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditQueryResult> {
    return await this.storage.queryDecisions(filters, limit, offset);
  }

  /**
   * Get statistics
   */
  async getStatistics(filters: AuditQueryFilters): Promise<AuditStatistics> {
    return await this.storage.getStatistics(filters);
  }

  /**
   * Export audit logs
   */
  async export(filters: AuditQueryFilters, format: 'json' | 'csv' = 'json'): Promise<string> {
    const result = await this.storage.queryDecisions(filters, 10000, 0);

    if (format === 'json') {
      return JSON.stringify(result.entries, null, 2);
    } else {
      return this.convertToCSV(result.entries);
    }
  }

  /**
   * Convert entries to CSV
   */
  private convertToCSV(entries: any[]): string {
    if (entries.length === 0) return '';

    const headers = [
      'timestamp',
      'tenant_id',
      'user_id',
      'resource_type',
      'resource_id',
      'action',
      'decision',
      'reason',
      'duration_ms',
    ];

    const rows = entries.map((entry) => [
      entry.timestamp,
      entry.tenant_id,
      entry.subject.user_id,
      entry.resource.type,
      entry.resource.id || '',
      entry.action,
      entry.decision,
      entry.reason || '',
      entry.duration_ms,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
