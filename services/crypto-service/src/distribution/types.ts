/**
 * Key Distribution Types
 */

export interface PreKeyBundle {
  registration_id: number;
  device_id: number;
  identity_key: Buffer;
  signed_pre_key: {
    id: number;
    public_key: Buffer;
    signature: Buffer;
  };
  pre_key?: {
    id: number;
    public_key: Buffer;
  };
}

export interface UploadIdentityKeyParams {
  user_id: string;
  tenant_id: string;
  device_id: number;
  registration_id: number;
  public_key: Buffer;
}

export interface UploadSignedPreKeyParams {
  user_id: string;
  tenant_id: string;
  device_id: number;
  key_id: number;
  public_key: Buffer;
  signature: Buffer;
  timestamp: number;
}

export interface UploadPreKeysParams {
  user_id: string;
  tenant_id: string;
  device_id: number;
  pre_keys: Array<{
    key_id: number;
    public_key: Buffer;
  }>;
}

export interface PreKeyRecord {
  key_id: number;
  user_id: string;
  tenant_id: string;
  device_id: number;
  public_key: Buffer;
  is_consumed: boolean;
  created_at: Date;
}

export interface SignedPreKeyRecord {
  key_id: number;
  user_id: string;
  tenant_id: string;
  device_id: number;
  public_key: Buffer;
  signature: Buffer;
  timestamp: number;
  created_at: Date;
  is_active: boolean;
}

export interface IdentityKeyRecord {
  user_id: string;
  tenant_id: string;
  device_id: number;
  registration_id: number;
  public_key: Buffer;
  created_at: Date;
  updated_at: Date;
}

export interface KeyChangeNotification {
  user_id: string;
  device_id: number;
  old_identity_key: Buffer;
  new_identity_key: Buffer;
  timestamp: Date;
  contacts: string[];
}

export interface PreKeyStats {
  user_id: string;
  device_id: number;
  total_pre_keys: number;
  consumed_pre_keys: number;
  available_pre_keys: number;
  needs_replenishment: boolean;
}
