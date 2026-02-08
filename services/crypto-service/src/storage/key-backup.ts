/**
 * Key Backup and Recovery
 */

import { randomBytes, createHash, pbkdf2 } from 'crypto';
import { promisify } from 'util';
import { keyEncryption } from './key-encryption';
import { KeyBackup, RecoveryKey } from './types';

const pbkdf2Async = promisify(pbkdf2);

export class KeyBackupService {
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly RECOVERY_KEY_LENGTH = 32;

  /**
   * Generate recovery key for user
   */
  async generateRecoveryKey(userId: string): Promise<RecoveryKey> {
    const recoveryKeyBytes = randomBytes(this.RECOVERY_KEY_LENGTH);
    const recoveryKey = recoveryKeyBytes.toString('base64url');
    
    // Hash recovery key for storage
    const hash = createHash('sha256').update(recoveryKeyBytes).digest();
    const recoveryKeyHash = hash.toString('hex');

    return {
      recovery_key: recoveryKey,
      recovery_key_hash: recoveryKeyHash,
      user_id: userId,
      created_at: new Date(),
    };
  }

  /**
   * Create encrypted backup of user's keys
   */
  async createBackup(
    userId: string,
    tenantId: string,
    keys: Buffer[],
    recoveryKey: string
  ): Promise<KeyBackup> {
    // Derive encryption key from recovery key
    const encryptionKey = await this.deriveEncryptionKey(recoveryKey);

    // Serialize keys
    const serializedKeys = this.serializeKeys(keys);

    // Encrypt keys
    const encrypted = await keyEncryption.encrypt(
      serializedKeys,
      encryptionKey
    );

    // Hash recovery key
    const recoveryKeyHash = createHash('sha256')
      .update(Buffer.from(recoveryKey, 'base64url'))
      .digest('hex');

    return {
      backup_id: randomBytes(16).toString('hex'),
      user_id: userId,
      tenant_id: tenantId,
      encrypted_keys: Buffer.concat([
        encrypted.iv,
        encrypted.auth_tag,
        encrypted.encrypted_key,
      ]),
      recovery_key_hash: recoveryKeyHash,
      created_at: new Date(),
    };
  }

  /**
   * Restore keys from backup
   */
  async restoreFromBackup(
    backup: KeyBackup,
    recoveryKey: string
  ): Promise<Buffer[]> {
    // Verify recovery key
    const recoveryKeyHash = createHash('sha256')
      .update(Buffer.from(recoveryKey, 'base64url'))
      .digest('hex');

    if (recoveryKeyHash !== backup.recovery_key_hash) {
      throw new Error('Invalid recovery key');
    }

    // Derive encryption key
    const encryptionKey = await this.deriveEncryptionKey(recoveryKey);

    // Extract IV, auth tag, and encrypted data
    const iv = backup.encrypted_keys.subarray(0, 12);
    const authTag = backup.encrypted_keys.subarray(12, 28);
    const encryptedData = backup.encrypted_keys.subarray(28);

    // Decrypt keys
    const decrypted = await keyEncryption.decrypt(
      encryptedData,
      encryptionKey,
      iv,
      authTag
    );

    // Deserialize keys
    return this.deserializeKeys(decrypted);
  }

  /**
   * Derive encryption key from recovery key using PBKDF2
   */
  private async deriveEncryptionKey(recoveryKey: string): Promise<Buffer> {
    const recoveryKeyBytes = Buffer.from(recoveryKey, 'base64url');
    const salt = Buffer.from('key_backup_salt'); // In production, use unique salt per backup

    return pbkdf2Async(
      recoveryKeyBytes,
      salt,
      this.PBKDF2_ITERATIONS,
      32,
      'sha256'
    );
  }

  /**
   * Serialize keys for backup
   */
  private serializeKeys(keys: Buffer[]): Buffer {
    const parts: Buffer[] = [];

    // Add count
    const count = Buffer.alloc(4);
    count.writeUInt32BE(keys.length, 0);
    parts.push(count);

    // Add each key with length prefix
    for (const key of keys) {
      const length = Buffer.alloc(4);
      length.writeUInt32BE(key.length, 0);
      parts.push(length);
      parts.push(key);
    }

    return Buffer.concat(parts);
  }

  /**
   * Deserialize keys from backup
   */
  private deserializeKeys(data: Buffer): Buffer[] {
    const keys: Buffer[] = [];
    let offset = 0;

    // Read count
    const count = data.readUInt32BE(offset);
    offset += 4;

    // Read each key
    for (let i = 0; i < count; i++) {
      const length = data.readUInt32BE(offset);
      offset += 4;

      const key = data.subarray(offset, offset + length);
      keys.push(key);
      offset += length;
    }

    return keys;
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backup: KeyBackup, recoveryKey: string): Promise<boolean> {
    try {
      await this.restoreFromBackup(backup, recoveryKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format recovery key for display (groups of 4)
   */
  formatRecoveryKey(recoveryKey: string): string {
    const groups: string[] = [];
    for (let i = 0; i < recoveryKey.length; i += 4) {
      groups.push(recoveryKey.slice(i, i + 4));
    }
    return groups.join('-');
  }

  /**
   * Parse formatted recovery key
   */
  parseRecoveryKey(formatted: string): string {
    return formatted.replace(/-/g, '');
  }
}

export const keyBackupService = new KeyBackupService();
