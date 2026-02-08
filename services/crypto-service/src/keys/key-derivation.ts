/**
 * Key Derivation Functions
 * HKDF implementation for deriving keys from master secrets
 */

import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { KeyDerivationParams, DerivedKeys } from './types';

export class KeyDerivation {
  /**
   * Derive key using HKDF-SHA256
   */
  async deriveKey(
    masterKey: Buffer,
    params: KeyDerivationParams
  ): Promise<Buffer> {
    const derived = hkdf(
      sha256,
      masterKey,
      params.salt,
      params.info,
      params.length
    );

    return Buffer.from(derived);
  }

  /**
   * Derive key using HKDF-SHA512
   */
  async deriveKeyWithSHA512(
    masterKey: Buffer,
    params: KeyDerivationParams
  ): Promise<Buffer> {
    const derived = hkdf(
      sha512,
      masterKey,
      params.salt,
      params.info,
      params.length
    );

    return Buffer.from(derived);
  }

  /**
   * Derive multiple keys from a single master key
   */
  async deriveMultipleKeys(
    masterKey: Buffer,
    salt: Buffer,
    count: number,
    keyLength: number = 32
  ): Promise<Buffer[]> {
    const keys: Buffer[] = [];

    for (let i = 0; i < count; i++) {
      const info = Buffer.from(`key_${i}`);
      const key = await this.deriveKey(masterKey, {
        salt,
        info,
        length: keyLength,
      });
      keys.push(key);
    }

    return keys;
  }

  /**
   * Derive encryption and authentication keys
   */
  async deriveEncryptionKeys(
    masterKey: Buffer,
    salt: Buffer
  ): Promise<DerivedKeys> {
    // Derive 80 bytes: 32 for encryption, 32 for auth, 16 for IV
    const derived = await this.deriveKey(masterKey, {
      salt,
      info: Buffer.from('encryption_keys'),
      length: 80,
    });

    return {
      encryptionKey: derived.subarray(0, 32),
      authKey: derived.subarray(32, 64),
      iv: derived.subarray(64, 80),
    };
  }

  /**
   * Derive tenant-specific encryption key
   */
  async deriveTenantKey(
    rootKey: Buffer,
    tenantId: string,
    salt?: Buffer
  ): Promise<Buffer> {
    const derivedSalt = salt || Buffer.from(tenantId);
    
    return this.deriveKey(rootKey, {
      salt: derivedSalt,
      info: Buffer.from(`tenant:${tenantId}`),
      length: 32,
    });
  }

  /**
   * Derive user-specific encryption key
   */
  async deriveUserKey(
    tenantKey: Buffer,
    userId: string,
    salt?: Buffer
  ): Promise<Buffer> {
    const derivedSalt = salt || Buffer.from(userId);
    
    return this.deriveKey(tenantKey, {
      salt: derivedSalt,
      info: Buffer.from(`user:${userId}`),
      length: 32,
    });
  }

  /**
   * Derive chain key for ratcheting
   */
  async deriveChainKey(
    currentChainKey: Buffer,
    constant: Buffer = Buffer.from([0x02])
  ): Promise<Buffer> {
    return this.deriveKey(currentChainKey, {
      salt: Buffer.alloc(0),
      info: constant,
      length: 32,
    });
  }

  /**
   * Derive message key from chain key
   */
  async deriveMessageKey(
    chainKey: Buffer,
    constant: Buffer = Buffer.from([0x01])
  ): Promise<Buffer> {
    return this.deriveKey(chainKey, {
      salt: Buffer.alloc(0),
      info: constant,
      length: 32,
    });
  }

  /**
   * Derive root key for Double Ratchet
   */
  async deriveRootKey(
    currentRootKey: Buffer,
    dhOutput: Buffer
  ): Promise<{ rootKey: Buffer; chainKey: Buffer }> {
    // Derive 64 bytes: 32 for new root key, 32 for chain key
    const derived = await this.deriveKey(currentRootKey, {
      salt: dhOutput,
      info: Buffer.from('root_key_derivation'),
      length: 64,
    });

    return {
      rootKey: derived.subarray(0, 32),
      chainKey: derived.subarray(32, 64),
    };
  }

  /**
   * Generate salt for key derivation
   */
  generateSalt(length: number = 32): Buffer {
    return Buffer.from(sha256(Buffer.from(Date.now().toString() + Math.random().toString())));
  }
}

export const keyDerivation = new KeyDerivation();
