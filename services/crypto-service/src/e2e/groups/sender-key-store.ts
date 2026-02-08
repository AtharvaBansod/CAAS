/**
 * Sender Key Store
 * Manages sender keys for group encryption
 */

import { SenderKeyRecord } from './types';

export class SenderKeyStore {
  private senderKeys: Map<string, SenderKeyRecord> = new Map();

  /**
   * Store sender key
   */
  async storeSenderKey(record: SenderKeyRecord): Promise<void> {
    const key = this.makeKey(
      record.group_id,
      record.sender_id,
      record.device_id
    );
    this.senderKeys.set(key, record);
  }

  /**
   * Load sender key
   */
  async loadSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number
  ): Promise<SenderKeyRecord | null> {
    const key = this.makeKey(groupId, senderId, deviceId);
    return this.senderKeys.get(key) || null;
  }

  /**
   * Check if sender key exists
   */
  async hasSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number
  ): Promise<boolean> {
    const key = this.makeKey(groupId, senderId, deviceId);
    return this.senderKeys.has(key);
  }

  /**
   * Delete sender key
   */
  async deleteSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number
  ): Promise<void> {
    const key = this.makeKey(groupId, senderId, deviceId);
    this.senderKeys.delete(key);
  }

  /**
   * Get all sender keys for group
   */
  async getGroupSenderKeys(groupId: string): Promise<SenderKeyRecord[]> {
    const keys: SenderKeyRecord[] = [];

    for (const record of this.senderKeys.values()) {
      if (record.group_id === groupId) {
        keys.push(record);
      }
    }

    return keys;
  }

  /**
   * Delete all sender keys for group
   */
  async deleteGroupSenderKeys(groupId: string): Promise<number> {
    let count = 0;

    for (const [key, record] of this.senderKeys.entries()) {
      if (record.group_id === groupId) {
        this.senderKeys.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Update sender key
   */
  async updateSenderKey(record: SenderKeyRecord): Promise<void> {
    record.updated_at = new Date();
    await this.storeSenderKey(record);
  }

  /**
   * Rotate sender key (increment chain ID)
   */
  async rotateSenderKey(
    groupId: string,
    senderId: string,
    deviceId: number,
    newChainKey: Buffer
  ): Promise<void> {
    const record = await this.loadSenderKey(groupId, senderId, deviceId);

    if (record) {
      record.chain_id++;
      record.chain_key = newChainKey;
      record.message_number = 0;
      await this.updateSenderKey(record);
    }
  }

  /**
   * Cleanup old sender keys
   */
  async cleanupOldKeys(daysOld: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    let count = 0;
    for (const [key, record] of this.senderKeys.entries()) {
      if (record.updated_at < cutoff) {
        this.senderKeys.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Make storage key
   */
  private makeKey(
    groupId: string,
    senderId: string,
    deviceId: number
  ): string {
    return `${groupId}:${senderId}:${deviceId}`;
  }
}

export const senderKeyStore = new SenderKeyStore();
