/**
 * Key Rotation Types
 */

export interface KeyRotationResult {
  old_key_id: string;
  new_key_id: string;
  rotated_at: Date;
  reason: RotationReason;
}

export type RotationReason = 
  | 'SCHEDULED'
  | 'MANUAL'
  | 'COMPROMISE'
  | 'POLICY'
  | 'EMERGENCY';

export type RevocationReason =
  | 'USER_INITIATED'
  | 'KEY_COMPROMISE'
  | 'DEVICE_LOST'
  | 'ADMIN_ACTION'
  | 'POLICY_VIOLATION'
  | 'SUPERSEDED';

export interface RotationStatus {
  user_id: string;
  tenant_id: string;
  last_rotation: Date | null;
  next_scheduled_rotation: Date | null;
  rotation_count: number;
  is_overdue: boolean;
}

export interface KeyRotationRecord {
  rotation_id: string;
  user_id: string;
  tenant_id: string;
  key_type: string;
  old_key_id: string;
  new_key_id: string;
  reason: RotationReason;
  rotated_at: Date;
  rotated_by?: string;
}

export interface RevokedKeyRecord {
  key_id: string;
  user_id: string;
  tenant_id: string;
  key_type: string;
  reason: RevocationReason;
  revoked_at: Date;
  revoked_by?: string;
  expires_at?: Date;
}

export interface RotationSchedule {
  key_type: string;
  interval_days: number;
  enabled: boolean;
}

export interface ReEncryptionJob {
  job_id: string;
  user_id: string;
  tenant_id: string;
  old_key_id: string;
  new_key_id: string;
  total_items: number;
  processed_items: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  error?: string;
}
