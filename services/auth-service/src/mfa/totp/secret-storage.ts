/**
 * TOTP Secret Storage
 * Phase 2 - Authentication - Task AUTH-009
 * 
 * Securely stores encrypted TOTP secrets
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

export class SecretStorage {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private saltLength = 32;
  private tagLength = 16;

  constructor(private encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }
  }

  /**
   * Encrypt TOTP secret
   */
  encrypt(secret: string): string {
    try {
      // Generate random salt and IV
      const salt = randomBytes(this.saltLength);
      const iv = randomBytes(this.ivLength);

      // Derive key from encryption key and salt
      const key = scryptSync(this.encryptionKey, salt, this.keyLength);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Failed to encrypt secret: ${error}`);
    }
  }

  /**
   * Decrypt TOTP secret
   */
  decrypt(encryptedSecret: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedSecret, 'base64');

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Derive key
      const key = scryptSync(this.encryptionKey, salt, this.keyLength);

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Failed to decrypt secret: ${error}`);
    }
  }

  /**
   * Validate encrypted secret format
   */
  isValidEncryptedSecret(encryptedSecret: string): boolean {
    try {
      const combined = Buffer.from(encryptedSecret, 'base64');
      const minLength = this.saltLength + this.ivLength + this.tagLength + 1;
      return combined.length >= minLength;
    } catch {
      return false;
    }
  }
}

/**
 * Create secret storage instance
 */
export function createSecretStorage(): SecretStorage {
  const encryptionKey = process.env.TOTP_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
  return new SecretStorage(encryptionKey);
}
