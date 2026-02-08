/**
 * Trusted Device Service
 * Phase 2 - Authentication - Task AUTH-011
 * 
 * Manages trusted devices for MFA bypass
 */

import { randomBytes } from 'crypto';
import { TrustedDevice } from '../types';
import { TrustStorage } from './trust-storage';
import { DeviceFingerprint as DeviceFingerprintUtil } from '../../sessions/device-fingerprint';

export interface TrustToken {
  token: string;
  device_id: string;
  expires_at: number;
}

export class TrustedDeviceService {
  constructor(
    private storage: TrustStorage,
    private trustExpiryDays: number = 30,
    private maxTrustedDevices: number = 10
  ) {}

  /**
   * Trust a device
   */
  async trustDevice(
    userId: string,
    deviceId: string,
    deviceName: string,
    fingerprint: string
  ): Promise<TrustToken> {
    // Check device limit
    const devices = await this.storage.getTrustedDevices(userId);
    if (devices.length >= this.maxTrustedDevices) {
      // Remove oldest device
      const oldest = devices.reduce((prev, current) =>
        prev.trusted_at < current.trusted_at ? prev : current
      );
      await this.storage.removeTrust(userId, oldest.device_id);
    }

    // Create trust token
    const token = this.generateTrustToken();
    const expiresAt = Date.now() + this.trustExpiryDays * 24 * 60 * 60 * 1000;

    // Store trusted device
    await this.storage.trustDevice(userId, {
      device_id: deviceId,
      device_name: deviceName,
      fingerprint_hash: fingerprint,
      trusted_at: Date.now(),
      expires_at: expiresAt,
      last_used: Date.now(),
    });

    return {
      token,
      device_id: deviceId,
      expires_at: expiresAt,
    };
  }

  /**
   * Verify trust token
   */
  async verifyTrust(
    userId: string,
    deviceId: string,
    fingerprint: string
  ): Promise<boolean> {
    const device = await this.storage.getTrustedDevice(userId, deviceId);
    
    if (!device) {
      return false;
    }

    // Check expiry
    if (Date.now() >= device.expires_at) {
      await this.storage.removeTrust(userId, deviceId);
      return false;
    }

    // Check fingerprint
    if (device.fingerprint_hash !== fingerprint) {
      return false;
    }

    // Update last used
    await this.storage.updateLastUsed(userId, deviceId);

    return true;
  }

  /**
   * Remove trust from device
   */
  async removeTrust(userId: string, deviceId: string): Promise<void> {
    await this.storage.removeTrust(userId, deviceId);
  }

  /**
   * Remove all trusted devices
   */
  async removeAllTrust(userId: string): Promise<void> {
    await this.storage.removeAllTrust(userId);
  }

  /**
   * Get trusted devices
   */
  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    return await this.storage.getTrustedDevices(userId);
  }

  /**
   * Check if device is trusted
   */
  async isTrusted(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.storage.getTrustedDevice(userId, deviceId);
    
    if (!device) {
      return false;
    }

    // Check expiry
    if (Date.now() >= device.expires_at) {
      await this.storage.removeTrust(userId, deviceId);
      return false;
    }

    return true;
  }

  /**
   * Generate trust token
   */
  private generateTrustToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get trust expiry days
   */
  getTrustExpiryDays(): number {
    return this.trustExpiryDays;
  }

  /**
   * Get max trusted devices
   */
  getMaxTrustedDevices(): number {
    return this.maxTrustedDevices;
  }
}
