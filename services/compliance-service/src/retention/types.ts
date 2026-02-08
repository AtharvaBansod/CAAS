/**
 * Data Retention Types
 */

export type DataType = 'messages' | 'files' | 'logs' | 'analytics' | 'sessions' | 'audit_logs';
export type RetentionAction = 'delete' | 'archive' | 'anonymize';

export interface RetentionPolicy {
  _id?: string;
  tenant_id: string;
  data_type: DataType;
  retention_days: number;
  action: RetentionAction;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RetentionResult {
  policy_id: string;
  data_type: DataType;
  records_processed: number;
  records_deleted: number;
  records_archived: number;
  records_anonymized: number;
  started_at: Date;
  completed_at: Date;
  errors: string[];
}

export interface ScheduledDeletion {
  data_type: DataType;
  cutoff_date: Date;
  estimated_records: number;
  scheduled_for: Date;
}

export interface LegalHold {
  _id?: string;
  tenant_id: string;
  data_type: DataType;
  resource_ids?: string[]; // Specific resources, or null for all
  reason: string;
  requested_by: string;
  requested_at: Date;
  expires_at?: Date;
  is_active: boolean;
}
