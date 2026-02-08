/**
 * Key Generation Service
 * Generates cryptographic keys using secure random sources
 */

import { ed25519, x25519 } from '@noble/curves/ed25519';
import { randomBytes } from 'crypto';
import { sha256 } from '@noble/hashes/sha256';
import {
  KeyPair,
  PreKey,
  SignedPreKey,
  IdentityKeyPair,
  SessionKey,
  PrivateKey,
} from './types';

export class KeyGenerator {
  /**
   * Generate Ed25519/X25519 identity key pair
   * Ed25519 for signing, X25519 for key agreement
   */
  async generateIdentityKeyPair(): Promise<IdentityKeyPair> {
    try {
      // Generate Ed25519 key pair for signing
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = ed25519.getPublicKey(privateKey);

      // Generate registration ID (random 14-bit number)
      const registrationId = this.generateRegistrationId();

      return {
        publicKey: Buffer.from(publicKey),
        privateKey: Buffer.from(privateKey),
        registrationId,
      };
    } finally {
      // Clear sensitive data from memory
      // Note: In production, use secure memory clearing
    }
  }

  /**
   * Generate signed pre-key with signature from identity key
   */
  async generateSignedPreKey(
    identityPrivateKey: PrivateKey,
    keyId: number
  ): Promise<SignedPreKey> {
    try {
      // Generate X25519 key pair for key agreement
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);

      // Sign the public key with identity key
      const signature = ed25519.sign(publicKey, identityPrivateKey.key);

      return {
        keyId,
        publicKey: Buffer.from(publicKey),
        privateKey: Buffer.from(privateKey),
        signature: Buffer.from(signature),
        timestamp: Date.now(),
      };
    } finally {
      // Clear sensitive data
    }
  }

  /**
   * Generate multiple one-time pre-keys
   */
  async generatePreKeys(startId: number, count: number): Promise<PreKey[]> {
    const preKeys: PreKey[] = [];

    try {
      for (let i = 0; i < count; i++) {
        const privateKey = x25519.utils.randomPrivateKey();
        const publicKey = x25519.getPublicKey(privateKey);

        preKeys.push({
          keyId: startId + i,
          publicKey: Buffer.from(publicKey),
          privateKey: Buffer.from(privateKey),
        });
      }

      return preKeys;
    } finally {
      // Clear sensitive data
    }
  }

  /**
   * Generate ephemeral key pair for session establishment
   */
  async generateEphemeralKeyPair(): Promise<KeyPair> {
    try {
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);

      return {
        publicKey: Buffer.from(publicKey),
        privateKey: Buffer.from(privateKey),
      };
    } finally {
      // Clear sensitive data
    }
  }

  /**
   * Generate session key for symmetric encryption
   */
  async generateSessionKey(): Promise<SessionKey> {
    const key = randomBytes(32); // 256-bit AES key
    const keyId = this.generateKeyId();

    return {
      key,
      keyId,
      createdAt: new Date(),
    };
  }

  /**
   * Generate API key for authentication
   */
  async generateApiKey(): Promise<string> {
    const bytes = randomBytes(32);
    return `sk_${bytes.toString('base64url')}`;
  }

  /**
   * Generate secret of specified byte length
   */
  async generateSecret(bytes: number): Promise<Buffer> {
    if (bytes < 16 || bytes > 64) {
      throw new Error('Secret length must be between 16 and 64 bytes');
    }
    return randomBytes(bytes);
  }

  /**
   * Generate registration ID (14-bit random number)
   */
  private generateRegistrationId(): number {
    const bytes = randomBytes(2);
    return bytes.readUInt16BE(0) & 0x3fff; // 14 bits
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const bytes = randomBytes(16);
    return bytes.toString('hex');
  }

  /**
   * Verify signed pre-key signature
   */
  async verifySignedPreKey(
    signedPreKey: SignedPreKey,
    identityPublicKey: Buffer
  ): Promise<boolean> {
    try {
      return ed25519.verify(
        signedPreKey.signature,
        signedPreKey.publicKey,
        identityPublicKey
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear buffer from memory (best effort)
   */
  private clearBuffer(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }
}

export const keyGenerator = new KeyGenerator();
