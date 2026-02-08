/**
 * Stub HSM Provider
 * Development/testing implementation of HSM interface
 */

import { randomBytes, createSign, createVerify, createCipheriv, createDecipheriv } from 'crypto';
import { BaseHSMProvider } from './hsm-provider';

export class StubHSMProvider extends BaseHSMProvider {
  private rootKey: Buffer;
  private signingKey: Buffer;

  constructor() {
    super();
    // In development, use environment variable or generate
    const rootKeyHex = process.env.HSM_ROOT_KEY;
    this.rootKey = rootKeyHex 
      ? Buffer.from(rootKeyHex, 'hex')
      : randomBytes(32);
    
    this.signingKey = randomBytes(32);
  }

  /**
   * Get root key from "HSM"
   */
  async getRootKey(): Promise<Buffer> {
    return this.rootKey;
  }

  /**
   * Sign data using "HSM"
   */
  async sign(data: Buffer): Promise<Buffer> {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    
    // In real HSM, this would use hardware-protected key
    return sign.sign(this.signingKey);
  }

  /**
   * Verify signature
   */
  async verify(data: Buffer, signature: Buffer): Promise<boolean> {
    try {
      const verify = createVerify('SHA256');
      verify.update(data);
      verify.end();
      
      return verify.verify(this.signingKey, signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Decrypt data using "HSM"
   */
  async decrypt(data: Buffer): Promise<Buffer> {
    // Extract IV (first 16 bytes)
    const iv = data.subarray(0, 16);
    const encrypted = data.subarray(16);

    const decipher = createDecipheriv('aes-256-cbc', this.rootKey, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Encrypt data using "HSM"
   */
  async encrypt(data: Buffer): Promise<Buffer> {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.rootKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    
    // Prepend IV
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Generate random bytes
   */
  async generateRandom(length: number): Promise<Buffer> {
    return randomBytes(length);
  }

  /**
   * Get HSM info
   */
  async getInfo(): Promise<{
    provider: string;
    version: string;
    available: boolean;
  }> {
    return {
      provider: 'stub',
      version: '1.0.0',
      available: true,
    };
  }

  /**
   * Rotate root key (for testing)
   */
  async rotateRootKey(): Promise<Buffer> {
    this.rootKey = randomBytes(32);
    return this.rootKey;
  }
}
