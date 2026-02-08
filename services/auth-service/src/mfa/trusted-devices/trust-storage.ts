/**
 * Trust Storage
 * Phase 2 - Authentication - Task AUTH-011
 * 
 * Stores trusted device information
 */

import { TrustedDevice } from '../types';

export interface TrustStorage {
  trustDevice(userId: string, device: TrustedDevice): Promise<void>;
  getTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice | null>;
  getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
  removeTrust(userId: string, deviceId: string): Promise<void>;
  removeAllTrust(userId: string): Promise<void>;
  updateLastUsed(userId: string, deviceId: string): Promise<void>;
}

/**
 * In-memory implementation (replace with database in production)
 */
export class InMemoryTrustStorage implements TrustStorage {
  private storage: Map<string, TrustedDevice[]> = new Map();

  async trustDevice(userId: string, device: TrustedDevice): Promise<void> {
    const devices = this.storage.get(userId) || [];
    
    // Remove existing device with same ID
    const filtered = devices.filter(d => d.device_id !== device.device_id);
    filtered.push(device);
    
    this.storage.set(userId, filtered);
  }

  async getTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice | null> {
    const devices = this.storage.get(userId) || [];
    return devices.find(d => d.device_id === deviceId) || null;
  }

  async getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
    return this.storage.get(userId) || [];
  }

  async removeTrust(userId: string, deviceId: string): Promise<void> {
    const devices = this.storage.get(userId) || [];
    const filtered = devices.filter(d => d.device_id !== deviceId);
    this.storage.set(userId, filtered);
  }

  async removeAllTrust(userId: string): Promise<void> {
    this.storage.delete(userId);
  }

  async updateLastUsed(userId: string, deviceId: string): Promise<void> {
    const device = await this.getTrustedDevice(userId, deviceId);
    if (device) {
      device.last_used = Date.now();
      await this.trustDevice(userId, device);
    }
  }
}

/**
 * Create trust storage instance
 */
export function createTrustStorage(): TrustStorage {
  // TODO: Replace with MongoDB implementation
  return new InMemoryTrustStorage();
}
