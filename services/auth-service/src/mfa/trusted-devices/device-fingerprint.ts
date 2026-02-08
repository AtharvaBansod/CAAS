/**
 * Device Fingerprint for Trusted Devices
 * Phase 2 - Authentication - Task AUTH-011
 * 
 * Generates device fingerprints for trust verification
 */

import { createHash } from 'crypto';

export interface FingerprintData {
  userAgent: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
}

export class DeviceFingerprint {
  /**
   * Generate fingerprint from data
   */
  static generate(data: FingerprintData): string {
    const components = [
      data.userAgent || '',
      data.screenResolution || '',
      data.timezone || '',
      data.language || '',
      data.platform || '',
    ];

    const combined = components.join('|');
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Validate fingerprint format
   */
  static isValid(fingerprint: string): boolean {
    return /^[a-f0-9]{64}$/i.test(fingerprint);
  }

  /**
   * Compare fingerprints
   */
  static match(fingerprint1: string, fingerprint2: string): boolean {
    return fingerprint1 === fingerprint2;
  }
}
