/**
 * Compliance Reporting Types
 */

export type ReportType =
  | 'security_summary'
  | 'gdpr_compliance'
  | 'access_audit'
  | 'data_retention'
  | 'soc2_readiness';

export type ReportFormat = 'pdf' | 'csv' | 'json' | 'html';

export interface ReportOptions {
  tenant_id?: string;
  start_date: Date;
  end_date: Date;
  format: ReportFormat;
  include_details?: boolean;
}

export interface Report {
  _id?: string;
  type: ReportType;
  tenant_id?: string;
  generated_by: string;
  generated_at: Date;
  period: {
    start: Date;
    end: Date;
  };
  format: ReportFormat;
  file_url?: string;
  data: any;
}

export interface ReportSchedule {
  _id?: string;
  tenant_id: string;
  report_type: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: ReportFormat;
  is_active: boolean;
  created_at: Date;
  last_run?: Date;
  next_run: Date;
}

export interface SecuritySummaryData {
  authentication: {
    total_attempts: number;
    successful_logins: number;
    failed_logins: number;
    mfa_enabled_users: number;
  };
  authorization: {
    total_checks: number;
    allowed: number;
    denied: number;
    top_denied_resources: Array<{ resource: string; count: number }>;
  };
  api_usage: {
    total_requests: number;
    by_endpoint: Record<string, number>;
    rate_limited: number;
  };
  security_events: {
    total: number;
    by_type: Record<string, number>;
  };
}

export interface GDPRComplianceData {
  data_subject_requests: {
    total: number;
    export_requests: number;
    erasure_requests: number;
    pending: number;
    completed: number;
  };
  consent: {
    total_users: number;
    consented: number;
    withdrawn: number;
  };
  data_retention: {
    policies_active: number;
    records_deleted: number;
    records_archived: number;
  };
}
