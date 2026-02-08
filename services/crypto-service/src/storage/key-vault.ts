/**
 * Key Vault
 * Secure storage for cryptographic keys with encryption at rest
 */

import { randomBytes } from 'crypto';
import { masterKeyProvider } from './master-key-provider';
import { keyEncryption } from './key-encryption';
import { keyAccessControl } from './key-access-control';
import {
  StoreKeyParams,
  DecryptedKey,
  EncryptedKeyRecord,
  KeyMetadata,
} from './types';

export class KeyVault {
  private keys: Map<string, EncryptedKeyRecord> = new Map();

  /**
   * Store key with encryption
   */
  async storeKey(params: StoreKeyParams): Promise<string> {
    // Generate unique key ID
    const keyId = this.generateKeyId();

    // Get encryption key for this user
    const encryptionKey = await masterKeyProvider.getUserKey(
      params.tenant_id,
      params.user_id
    );

    // Prepare AAD with metadata
    const aad = Buffer.from(JSON.stringify({
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      key_type: params.key_type,
      key_id: keyId,
    }));

    // Encrypt key material
    const encrypted = await keyEncryption.encrypt(
      params.key_material,
      encryptionKey,
      aad
    );

    // Create encrypted key record
    const record: EncryptedKeyRecord = {
      key_id: keyId,
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      key_type: params.key_type,
      encrypted_key: encrypted.encrypted_key,
      encryption_key_id: 'current',
      iv: encrypted.iv,
      auth_tag: encrypted.auth_tag,
      created_at: new Date(),
      expires_at: params.expires_at,
      is_active: true,
      metadata: params.metadata,
    };

    // Store record (in production, persist to MongoDB)
    this.keys.set(keyId, record);

    // Log access
    await keyAccessControl.logAccess({
      key_id: keyId,
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      action: 'store',
      timestamp: new Date(),
    });

    return keyId;
  }

  /**
   * Retrieve and decrypt key
   */
  async retrieveKey(
    keyId: string,
    userId: string,
    tenantId: string
  ): Promise<DecryptedKey> {
    // Get encrypted record
    const record = this.keys.get(keyId);
    if (!record) {
      throw new Error('Key not found');
    }

    // Check access control
    const canAccess = await keyAccessControl.canAccessKey(
      userId,
      record.user_id,
      tenantId,
      record.tenant_id
    );

    if (!canAccess) {
      throw new Error('Access denied');
    }

    // Check rate limit
    const withinLimit = await keyAccessControl.checkRateLimit(userId);
    if (!withinLimit) {
      throw new Error('Rate limit exceeded');
    }

    // Check if key is active
    if (!record.is_active) {
      throw new Error('Key is not active');
    }

    // Check expiration
    if (record.expires_at && record.expires_at < new Date()) {
      throw new Error('Key has expired');
    }

    // Get decryption key
    const decryptionKey = await masterKeyProvider.getUserKey(
      record.tenant_id,
      record.user_id
    );

    // Prepare AAD
    const aad = Buffer.from(JSON.stringify({
      user_id: record.user_id,
      tenant_id: record.tenant_id,
      key_type: record.key_type,
      key_id: record.key_id,
    }));

    // Decrypt key material
    const keyMaterial = await keyEncryption.decrypt(
      record.encrypted_key,
      decryptionKey,
      record.iv,
      record.auth_tag,
      aad
    );

    // Log access
    await keyAccessControl.logAccess({
      key_id: keyId,
      user_id: userId,
      tenant_id: tenantId,
      action: 'retrieve',
      timestamp: new Date(),
    });

    return {
      key_id: record.key_id,
      user_id: record.user_id,
      tenant_id: record.tenant_id,
      key_type: record.key_type,
      key_material: keyMaterial,
      created_at: record.created_at,
      expires_at: record.expires_at,
      metadata: record.metadata,
    };
  }

  /**
   * Delete key
   */
  async deleteKey(
    keyId: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const record = this.keys.get(keyId);
    if (!record) {
      throw new Error('Key not found');
    }

    // Check access control
    const canAccess = await keyAccessControl.canAccessKey(
      userId,
      record.user_id,
      tenantId,
      record.tenant_id
    );

    if (!canAccess) {
      throw new Error('Access denied');
    }

    // Delete key
    this.keys.delete(keyId);

    // Log access
    await keyAccessControl.logAccess({
      key_id: keyId,
      user_id: userId,
      tenant_id: tenantId,
      action: 'delete',
      timestamp: new Date(),
    });
  }

  /**
   * Rotate key encryption
   */
  async rotateKey(
    keyId: string,
    userId: string,
    tenantId: string
  ): Promise<string> {
    // Retrieve current key
    const decrypted = await this.retrieveKey(keyId, userId, tenantId);

    // Store with new encryption
    const newKeyId = await this.storeKey({
      user_id: decrypted.user_id,
      tenant_id: decrypted.tenant_id,
      key_type: decrypted.key_type,
      key_material: decrypted.key_material,
      metadata: decrypted.metadata,
      expires_at: decrypted.expires_at,
    });

    // Deactivate old key
    const oldRecord = this.keys.get(keyId);
    if (oldRecord) {
      oldRecord.is_active = false;
      this.keys.set(keyId, oldRecord);
    }

    // Clear decrypted material
    decrypted.key_material.fill(0);

    // Log rotation
    await keyAccessControl.logAccess({
      key_id: newKeyId,
      user_id: userId,
      tenant_id: tenantId,
      action: 'rotate',
      timestamp: new Date(),
    });

    return newKeyId;
  }

  /**
   * List keys for user
   */
  async listKeys(
    userId: string,
    tenantId: string
  ): Promise<KeyMetadata[]> {
    const userKeys: KeyMetadata[] = [];

    for (const record of this.keys.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        userKeys.push({
          key_id: record.key_id,
          key_type: record.key_type,
          user_id: record.user_id,
          tenant_id: record.tenant_id,
          created_at: record.created_at,
          expires_at: record.expires_at,
          is_active: record.is_active,
        });
      }
    }

    return userKeys;
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Get key count for user
   */
  async getKeyCount(userId: string, tenantId: string): Promise<number> {
    const keys = await this.listKeys(userId, tenantId);
    return keys.length;
  }

  /**
   * Cleanup expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const [keyId, record] of this.keys.entries()) {
      if (record.expires_at && record.expires_at < now) {
        this.keys.delete(keyId);
        count++;
      }
    }

    return count;
  }
}

export const keyVault = new KeyVault();
