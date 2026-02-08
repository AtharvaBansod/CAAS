/**
 * Key Storage Types
 */

import { KeyType } from '../keys/types';

export interface StoreKeyParams {
  user_id: string;
  tenant_id: string;
  key_type: KeyType;
  key_material: Buffer;
  metadata?: Record<string, unknown>;
  expires_at?: Date;
}

export interface DecryptedKey {
  key_id: string;
  user_id: string;
  tenant_id: string;
  key_type: KeyType;
  key_material: Buffer;
  created_at: Date;
  expires_at?: Date;
  metadata?: Record<string, unknown>;
}

export interface EncryptedKeyRecord {
  _id?: unknown;
  key_id: string;
  user_id: string;
  tenant_id: string;
  key_type: KeyType;
  encrypted_key: Buffer;
  encryption_key_id: string;
  iv: Buffer;
  auth_tag: Buffer;
  created_at: Date;
  expires_at?: Date;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

export interface KeyMetadata {
  key_id: string;
  key_type: KeyType;
  user_id: string;
  tenant_id: string;
  created_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface MasterKeyInfo {
  key_id: string;
  version: number;
  created_at: Date;
  is_active: boolean;
}

export interface HSMProvider {
  getRootKey(): Promise<Buffer>;
  sign(data: Buffer): Promise<Buffer>;
  decrypt(data: Buffer): Promise<Buffer>;
  encrypt(data: Buffer): Promise<Buffer>;
}

export interface KeyAccessLog {
  key_id: string;
  user_id: string;
  tenant_id: string;
  action: 'store' | 'retrieve' | 'delete' | 'rotate';
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface KeyBackup {
  backup_id: string;
  user_id: string;
  tenant_id: string;
  encrypted_keys: Buffer;
  recovery_key_hash: string;
  created_at: Date;
}

export interface RecoveryKey {
  recovery_key: string;
  recovery_key_hash: string;
  user_id: string;
  created_at: Date;
}

export interface KeyEncryptionResult {
  encrypted_key: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
  encryption_key_id: string;
}
