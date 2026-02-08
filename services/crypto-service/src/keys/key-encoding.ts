/**
 * Key Encoding and Fingerprint Generation
 */

import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { KeyEncoding, KeyEncodingOptions, KeyFingerprint } from './types';

export class KeyEncoding {
  /**
   * Encode key to specified format
   */
  encode(key: Buffer, encoding: KeyEncoding = 'base64'): string {
    switch (encoding) {
      case 'base64':
        return key.toString('base64');
      case 'hex':
        return key.toString('hex');
      case 'binary':
        return key.toString('binary');
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  /**
   * Decode key from string
   */
  decode(encoded: string, encoding: KeyEncoding = 'base64'): Buffer {
    switch (encoding) {
      case 'base64':
        return Buffer.from(encoded, 'base64');
      case 'hex':
        return Buffer.from(encoded, 'hex');
      case 'binary':
        return Buffer.from(encoded, 'binary');
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  /**
   * Encode with prefix
   */
  encodeWithPrefix(key: Buffer, options: KeyEncodingOptions): string {
    const encoded = this.encode(key, options.encoding);
    return options.prefix ? `${options.prefix}${encoded}` : encoded;
  }

  /**
   * Decode with prefix removal
   */
  decodeWithPrefix(encoded: string, options: KeyEncodingOptions): Buffer {
    let data = encoded;
    if (options.prefix && encoded.startsWith(options.prefix)) {
      data = encoded.slice(options.prefix.length);
    }
    return this.decode(data, options.encoding);
  }

  /**
   * Generate key fingerprint using SHA-256
   */
  generateFingerprint(key: Buffer, algorithm: 'sha256' | 'sha512' = 'sha256'): KeyFingerprint {
    const hash = algorithm === 'sha256' 
      ? sha256(key)
      : sha512(key);

    // Format as human-readable fingerprint
    const fingerprint = this.formatFingerprint(Buffer.from(hash));

    return {
      fingerprint,
      algorithm,
    };
  }

  /**
   * Format fingerprint as human-readable string
   * Example: 1234 5678 90AB CDEF ...
   */
  private formatFingerprint(hash: Buffer): string {
    const hex = hash.toString('hex').toUpperCase();
    const groups: string[] = [];

    for (let i = 0; i < hex.length; i += 4) {
      groups.push(hex.slice(i, i + 4));
    }

    return groups.join(' ');
  }

  /**
   * Generate short fingerprint (first 8 bytes)
   */
  generateShortFingerprint(key: Buffer): string {
    const hash = sha256(key);
    return Buffer.from(hash).subarray(0, 8).toString('hex').toUpperCase();
  }

  /**
   * Verify fingerprint matches key
   */
  verifyFingerprint(key: Buffer, fingerprint: string, algorithm: 'sha256' | 'sha512' = 'sha256'): boolean {
    const generated = this.generateFingerprint(key, algorithm);
    return generated.fingerprint === fingerprint;
  }

  /**
   * Encode key for storage (base64)
   */
  encodeForStorage(key: Buffer): string {
    return this.encode(key, 'base64');
  }

  /**
   * Decode key from storage
   */
  decodeFromStorage(encoded: string): Buffer {
    return this.decode(encoded, 'base64');
  }

  /**
   * Encode key for display (hex with spaces)
   */
  encodeForDisplay(key: Buffer): string {
    const hex = this.encode(key, 'hex').toUpperCase();
    const groups: string[] = [];

    for (let i = 0; i < hex.length; i += 8) {
      groups.push(hex.slice(i, i + 8));
    }

    return groups.join(' ');
  }

  /**
   * Encode key for URL (base64url)
   */
  encodeForURL(key: Buffer): string {
    return key.toString('base64url');
  }

  /**
   * Decode key from URL
   */
  decodeFromURL(encoded: string): Buffer {
    return Buffer.from(encoded, 'base64url');
  }

  /**
   * Test encoding roundtrip
   */
  testRoundtrip(key: Buffer, encoding: KeyEncoding): boolean {
    try {
      const encoded = this.encode(key, encoding);
      const decoded = this.decode(encoded, encoding);
      return key.equals(decoded);
    } catch (error) {
      return false;
    }
  }

  /**
   * Compare two keys in constant time
   */
  constantTimeCompare(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }
}

export const keyEncoding = new KeyEncoding();
