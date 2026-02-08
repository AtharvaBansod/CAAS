/**
 * Pre-Key Manager
 * Manages one-time pre-keys lifecycle
 */

import { PreKeyRecord, PreKeyStats } from './types';

export class PreKeyManager {
  private preKeys: Map<string, PreKeyRecord> = new Map();
  private readonly REPLENISHMENT_THRESHOLD = 20;
  private readonly MIN_PRE_KEYS = 100;

  /**
   * Store pre-keys
   */
  async storePreKeys(
    userId: string,
    tenantId: string,
    deviceId: number,
    preKeys: Array<{ key_id: number; public_key: Buffer }>
  ): Promise<void> {
    for (const preKey of preKeys) {
      const key = this.makeKey(userId, deviceId, preKey.key_id);
      
      const record: PreKeyRecord = {
        key_id: preKey.key_id,
        user_id: userId,
        tenant_id: tenantId,
        device_id: deviceId,
        public_key: preKey.public_key,
        is_consumed: false,
        created_at: new Date(),
      };

      this.preKeys.set(key, record);
    }
  }

  /**
   * Get and consume a pre-key
   */
  async consumePreKey(
    userId: string,
    deviceId: number
  ): Promise<PreKeyRecord | null> {
    // Find an unconsumed pre-key
    for (const [key, record] of this.preKeys.entries()) {
      if (
        record.user_id === userId &&
        record.device_id === deviceId &&
        !record.is_consumed
      ) {
        // Mark as consumed
        record.is_consumed = true;
        this.preKeys.set(key, record);

        return record;
      }
    }

    return null;
  }

  /**
   * Get pre-key statistics
   */
  async getPreKeyStats(
    userId: string,
    deviceId: number
  ): Promise<PreKeyStats> {
    let total = 0;
    let consumed = 0;

    for (const record of this.preKeys.values()) {
      if (record.user_id === userId && record.device_id === deviceId) {
        total++;
        if (record.is_consumed) {
          consumed++;
        }
      }
    }

    const available = total - consumed;
    const needsReplenishment = available < this.REPLENISHMENT_THRESHOLD;

    return {
      user_id: userId,
      device_id: deviceId,
      total_pre_keys: total,
      consumed_pre_keys: consumed,
      available_pre_keys: available,
      needs_replenishment: needsReplenishment,
    };
  }

  /**
   * Check if replenishment is needed
   */
  async needsReplenishment(
    userId: string,
    deviceId: number
  ): Promise<boolean> {
    const stats = await this.getPreKeyStats(userId, deviceId);
    return stats.needs_replenishment;
  }

  /**
   * Delete consumed pre-keys
   */
  async cleanupConsumedKeys(
    userId: string,
    deviceId: number
  ): Promise<number> {
    let count = 0;

    for (const [key, record] of this.preKeys.entries()) {
      if (
        record.user_id === userId &&
        record.device_id === deviceId &&
        record.is_consumed
      ) {
        this.preKeys.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Delete all pre-keys for user/device
   */
  async deleteAllPreKeys(
    userId: string,
    deviceId: number
  ): Promise<number> {
    let count = 0;

    for (const [key, record] of this.preKeys.entries()) {
      if (record.user_id === userId && record.device_id === deviceId) {
        this.preKeys.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Get available pre-key count
   */
  async getAvailableCount(
    userId: string,
    deviceId: number
  ): Promise<number> {
    const stats = await this.getPreKeyStats(userId, deviceId);
    return stats.available_pre_keys;
  }

  /**
   * Make storage key
   */
  private makeKey(userId: string, deviceId: number, keyId: number): string {
    return `${userId}:${deviceId}:${keyId}`;
  }

  /**
   * Get replenishment threshold
   */
  getReplenishmentThreshold(): number {
    return this.REPLENISHMENT_THRESHOLD;
  }

  /**
   * Get minimum pre-keys count
   */
  getMinPreKeys(): number {
    return this.MIN_PRE_KEYS;
  }
}

export const preKeyManager = new PreKeyManager();
