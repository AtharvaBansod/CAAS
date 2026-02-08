/**
 * Signed Pre-Key Rotation
 * Manages signed pre-key lifecycle and rotation
 */

import { SignedPreKeyRecord } from './types';

export class SignedPreKeyRotation {
  private signedPreKeys: Map<string, SignedPreKeyRecord> = new Map();
  private readonly ROTATION_INTERVAL_DAYS = 7;
  private readonly GRACE_PERIOD_DAYS = 3;

  /**
   * Store signed pre-key
   */
  async storeSignedPreKey(
    userId: string,
    tenantId: string,
    deviceId: number,
    keyId: number,
    publicKey: Buffer,
    signature: Buffer,
    timestamp: number
  ): Promise<void> {
    // Deactivate old signed pre-keys
    await this.deactivateOldKeys(userId, deviceId);

    const key = this.makeKey(userId, deviceId, keyId);
    
    const record: SignedPreKeyRecord = {
      key_id: keyId,
      user_id: userId,
      tenant_id: tenantId,
      device_id: deviceId,
      public_key: publicKey,
      signature,
      timestamp,
      created_at: new Date(),
      is_active: true,
    };

    this.signedPreKeys.set(key, record);
  }

  /**
   * Get active signed pre-key
   */
  async getActiveSignedPreKey(
    userId: string,
    deviceId: number
  ): Promise<SignedPreKeyRecord | null> {
    for (const record of this.signedPreKeys.values()) {
      if (
        record.user_id === userId &&
        record.device_id === deviceId &&
        record.is_active
      ) {
        return record;
      }
    }

    return null;
  }

  /**
   * Check if rotation is needed
   */
  async needsRotation(
    userId: string,
    deviceId: number
  ): Promise<boolean> {
    const activeKey = await this.getActiveSignedPreKey(userId, deviceId);
    
    if (!activeKey) {
      return true;
    }

    const daysSinceCreation = this.getDaysSince(activeKey.created_at);
    return daysSinceCreation >= this.ROTATION_INTERVAL_DAYS;
  }

  /**
   * Deactivate old signed pre-keys
   */
  private async deactivateOldKeys(
    userId: string,
    deviceId: number
  ): Promise<void> {
    for (const [key, record] of this.signedPreKeys.entries()) {
      if (
        record.user_id === userId &&
        record.device_id === deviceId &&
        record.is_active
      ) {
        record.is_active = false;
        this.signedPreKeys.set(key, record);
      }
    }
  }

  /**
   * Cleanup expired keys (after grace period)
   */
  async cleanupExpiredKeys(): Promise<number> {
    let count = 0;
    const now = new Date();

    for (const [key, record] of this.signedPreKeys.entries()) {
      if (!record.is_active) {
        const daysSinceDeactivation = this.getDaysSince(record.created_at);
        
        if (daysSinceDeactivation > this.ROTATION_INTERVAL_DAYS + this.GRACE_PERIOD_DAYS) {
          this.signedPreKeys.delete(key);
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Get signed pre-key by ID
   */
  async getSignedPreKeyById(
    userId: string,
    deviceId: number,
    keyId: number
  ): Promise<SignedPreKeyRecord | null> {
    const key = this.makeKey(userId, deviceId, keyId);
    return this.signedPreKeys.get(key) || null;
  }

  /**
   * Delete all signed pre-keys for user/device
   */
  async deleteAllSignedPreKeys(
    userId: string,
    deviceId: number
  ): Promise<number> {
    let count = 0;

    for (const [key, record] of this.signedPreKeys.entries()) {
      if (record.user_id === userId && record.device_id === deviceId) {
        this.signedPreKeys.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Verify signed pre-key signature
   */
  async verifySignature(
    signedPreKey: SignedPreKeyRecord,
    identityPublicKey: Buffer
  ): Promise<boolean> {
    // Import verification from key-generator
    const { keyGenerator } = require('../keys/key-generator');
    
    return keyGenerator.verifySignedPreKey(
      {
        keyId: signedPreKey.key_id,
        publicKey: signedPreKey.public_key,
        signature: signedPreKey.signature,
        timestamp: signedPreKey.timestamp,
      },
      identityPublicKey
    );
  }

  /**
   * Get days since date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Make storage key
   */
  private makeKey(userId: string, deviceId: number, keyId: number): string {
    return `${userId}:${deviceId}:${keyId}`;
  }

  /**
   * Get rotation interval
   */
  getRotationInterval(): number {
    return this.ROTATION_INTERVAL_DAYS;
  }

  /**
   * Get grace period
   */
  getGracePeriod(): number {
    return this.GRACE_PERIOD_DAYS;
  }
}

export const signedPreKeyRotation = new SignedPreKeyRotation();
