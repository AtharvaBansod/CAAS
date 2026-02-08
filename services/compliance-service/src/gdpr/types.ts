/**
 * GDPR Types
 * 
 * Type definitions for GDPR data subject rights
 */

/**
 * Data export request
 */
export interface DataExportRequest {
  _id?: string;
  user_id: string;
  tenant_id: string;
  request_type: 'export' | 'erasure';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format?: 'json' | 'csv';
  requested_at: Date;
  completed_at?: Date;
  expires_at?: Date;
  download_url?: string;
  error?: string;
}

/**
 * Data export result
 */
export interface DataExportResult {
  user: any;
  messages: any[];
  conversations: any[];
  files: any[];
  groups: any[];
  settings: any;
  metadata: {
    exported_at: Date;
    total_records: number;
    format: string;
  };
}

/**
 * Data erasure request
 */
export interface DataErasureRequest {
  _id?: string;
  user_id: string;
  tenant_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: Date;
  completed_at?: Date;
  verification_code?: string;
  verified: boolean;
  erasure_summary?: ErasureSummary;
  error?: string;
}

/**
 * Erasure summary
 */
export interface ErasureSummary {
  user_deleted: boolean;
  messages_deleted: number;
  files_deleted: number;
  conversations_updated: number;
  groups_updated: number;
  total_records_affected: number;
}

/**
 * Consent record
 */
export interface ConsentRecord {
  _id?: string;
  user_id: string;
  tenant_id: string;
  consent_type: 'data_processing' | 'marketing' | 'analytics' | 'third_party';
  granted: boolean;
  granted_at?: Date;
  revoked_at?: Date;
  ip_address?: string;
  user_agent?: string;
  version: string;
}

/**
 * Data minimization rule
 */
export interface DataMinimizationRule {
  _id?: string;
  tenant_id: string;
  data_type: string;
  retention_days: number;
  anonymize_after_days?: number;
  is_active: boolean;
}
