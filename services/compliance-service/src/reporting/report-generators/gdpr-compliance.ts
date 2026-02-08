/**
 * GDPR Compliance Report Generator
 */

import { Db } from 'mongodb';
import { ReportOptions, GDPRComplianceData } from '../types';

export class GDPRComplianceGenerator {
  constructor(private db: Db) {}

  async generate(options: ReportOptions): Promise<GDPRComplianceData> {
    const { start_date, end_date, tenant_id } = options;

    const [dataSubjectRequests, consent, dataRetention] = await Promise.all([
      this.getDataSubjectRequests(start_date, end_date, tenant_id),
      this.getConsentStats(tenant_id),
      this.getDataRetentionStats(start_date, end_date, tenant_id),
    ]);

    return {
      data_subject_requests: dataSubjectRequests,
      consent,
      data_retention: dataRetention,
    };
  }

  private async getDataSubjectRequests(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      requested_at: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const requests = await this.db.collection('privacy_requests').find(query).toArray();

    return {
      total: requests.length,
      export_requests: requests.filter(r => r.request_type === 'export').length,
      erasure_requests: requests.filter(r => r.request_type === 'erasure').length,
      pending: requests.filter(r => r.status === 'pending').length,
      completed: requests.filter(r => r.status === 'completed').length,
    };
  }

  private async getConsentStats(tenantId?: string) {
    const query: any = {};
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const totalUsers = await this.db.collection('users').countDocuments(query);

    // Get consent records
    const consentRecords = await this.db
      .collection('user_consent')
      .find(query)
      .toArray();

    const consented = consentRecords.filter((r) => r.granted).length;
    const withdrawn = consentRecords.filter((r) => !r.granted && r.withdrawn_at).length;

    // Get consent by type
    const byType: Record<string, { granted: number; withdrawn: number }> = {};
    for (const record of consentRecords) {
      const type = record.consent_type;
      if (!byType[type]) {
        byType[type] = { granted: 0, withdrawn: 0 };
      }
      if (record.granted) {
        byType[type].granted++;
      } else if (record.withdrawn_at) {
        byType[type].withdrawn++;
      }
    }

    return {
      total_users: totalUsers,
      consented,
      withdrawn,
      by_type: byType,
    };
  }

  private async getDataRetentionStats(start: Date, end: Date, tenantId?: string) {
    const query: any = {
      executed_at: { $gte: start, $lte: end },
    };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    // Get active policies
    const policyQuery: any = { is_active: true };
    if (tenantId) {
      policyQuery.tenant_id = tenantId;
    }
    const policiesActive = await this.db
      .collection('retention_policies')
      .countDocuments(policyQuery);

    // Get retention execution results
    const executions = await this.db
      .collection('retention_executions')
      .find(query)
      .toArray();

    const recordsDeleted = executions.reduce(
      (sum, exec) => sum + (exec.records_deleted || 0),
      0
    );
    const recordsArchived = executions.reduce(
      (sum, exec) => sum + (exec.records_archived || 0),
      0
    );

    return {
      policies_active: policiesActive,
      records_deleted: recordsDeleted,
      records_archived: recordsArchived,
    };
  }
}
