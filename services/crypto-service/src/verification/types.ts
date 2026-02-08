/**
 * Verification Types
 */

export interface SafetyNumber {
  user1_id: string;
  user2_id: string;
  safety_number: string;
  generated_at: Date;
}

export interface VerificationRecord {
  user1_id: string;
  user2_id: string;
  verified_at: Date;
  verified_by: string;
  is_verified: boolean;
}

export interface KeyChangeEvent {
  user_id: string;
  device_id: number;
  old_identity_key: Buffer;
  new_identity_key: Buffer;
  timestamp: Date;
  affected_users: string[];
}

export interface QRCodeData {
  version: number;
  user1_id: string;
  user2_id: string;
  user1_key_fingerprint: string;
  user2_key_fingerprint: string;
}
