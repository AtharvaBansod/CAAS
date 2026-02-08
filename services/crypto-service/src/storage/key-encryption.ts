/**
 * Key Encryption
 * Encrypts key material using AES-256-GCM
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { KeyEncryptionResult } from './types';

export class KeyEncryption {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12; // 96 bits for GCM
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits

  /**
   * Encrypt key material with AES-256-GCM
   */
  async encrypt(
    keyMaterial: Buffer,
    encryptionKey: Buffer,
    aad?: Buffer
  ): Promise<KeyEncryptionResult> {
    if (encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }

    // Generate random IV
    const iv = randomBytes(this.IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(this.ALGORITHM, encryptionKey, iv);

    // Set additional authenticated data if provided
    if (aad) {
      cipher.setAAD(aad);
    }

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(keyMaterial),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted_key: encrypted,
      iv,
      auth_tag: authTag,
      encryption_key_id: 'current', // Will be set by caller
    };
  }

  /**
   * Decrypt key material
   */
  async decrypt(
    encryptedKey: Buffer,
    encryptionKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad?: Buffer
  ): Promise<Buffer> {
    if (encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes');
    }

    if (iv.length !== this.IV_LENGTH) {
      throw new Error(`IV must be ${this.IV_LENGTH} bytes`);
    }

    if (authTag.length !== this.AUTH_TAG_LENGTH) {
      throw new Error(`Auth tag must be ${this.AUTH_TAG_LENGTH} bytes`);
    }

    // Create decipher
    const decipher = createDecipheriv(this.ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Set additional authenticated data if provided
    if (aad) {
      decipher.setAAD(aad);
    }

    try {
      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encryptedKey),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: Invalid key or corrupted data');
    }
  }

  /**
   * Encrypt with metadata as AAD
   */
  async encryptWithMetadata(
    keyMaterial: Buffer,
    encryptionKey: Buffer,
    metadata: Record<string, unknown>
  ): Promise<KeyEncryptionResult> {
    const aad = Buffer.from(JSON.stringify(metadata));
    return this.encrypt(keyMaterial, encryptionKey, aad);
  }

  /**
   * Decrypt with metadata verification
   */
  async decryptWithMetadata(
    encryptedKey: Buffer,
    encryptionKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    metadata: Record<string, unknown>
  ): Promise<Buffer> {
    const aad = Buffer.from(JSON.stringify(metadata));
    return this.decrypt(encryptedKey, encryptionKey, iv, authTag, aad);
  }

  /**
   * Re-encrypt key with new encryption key
   */
  async reEncrypt(
    encryptedKey: Buffer,
    oldEncryptionKey: Buffer,
    newEncryptionKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad?: Buffer
  ): Promise<KeyEncryptionResult> {
    // Decrypt with old key
    const decrypted = await this.decrypt(
      encryptedKey,
      oldEncryptionKey,
      iv,
      authTag,
      aad
    );

    // Encrypt with new key
    const result = await this.encrypt(decrypted, newEncryptionKey, aad);

    // Clear decrypted data
    decrypted.fill(0);

    return result;
  }

  /**
   * Verify encryption integrity
   */
  async verifyIntegrity(
    encryptedKey: Buffer,
    encryptionKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad?: Buffer
  ): Promise<boolean> {
    try {
      await this.decrypt(encryptedKey, encryptionKey, iv, authTag, aad);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const keyEncryption = new KeyEncryption();
