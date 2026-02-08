/**
 * Key Server
 * Main service for key distribution
 */

import { preKeyManager } from './pre-key-manager';
import { signedPreKeyRotation } from './signed-pre-key-rotation';
import { keyChangeNotificationService } from './key-change-notification';
import {
  PreKeyBundle,
  UploadIdentityKeyParams,
  UploadSignedPreKeyParams,
  UploadPreKeysParams,
  IdentityKeyRecord,
} from './types';

export class KeyServer {
  private identityKeys: Map<string, IdentityKeyRecord> = new Map();

  /**
   * Upload identity key
   */
  async uploadIdentityKey(params: UploadIdentityKeyParams): Promise<void> {
    const key = this.makeIdentityKey(params.user_id, params.device_id);
    
    // Check if identity key exists
    const existing = this.identityKeys.get(key);
    
    const record: IdentityKeyRecord = {
      user_id: params.user_id,
      tenant_id: params.tenant_id,
      device_id: params.device_id,
      registration_id: params.registration_id,
      public_key: params.public_key,
      created_at: existing?.created_at || new Date(),
      updated_at: new Date(),
    };

    // If key changed, notify contacts
    if (existing && !existing.public_key.equals(params.public_key)) {
      // TODO: Get user's contacts from database
      const contacts: string[] = [];
      
      await keyChangeNotificationService.notifyKeyChange(
        params.user_id,
        params.device_id,
        existing.public_key,
        params.public_key,
        contacts
      );
    }

    this.identityKeys.set(key, record);
  }

  /**
   * Upload signed pre-key
   */
  async uploadSignedPreKey(params: UploadSignedPreKeyParams): Promise<void> {
    await signedPreKeyRotation.storeSignedPreKey(
      params.user_id,
      params.tenant_id,
      params.device_id,
      params.key_id,
      params.public_key,
      params.signature,
      params.timestamp
    );
  }

  /**
   * Upload one-time pre-keys
   */
  async uploadPreKeys(params: UploadPreKeysParams): Promise<void> {
    await preKeyManager.storePreKeys(
      params.user_id,
      params.tenant_id,
      params.device_id,
      params.pre_keys
    );
  }

  /**
   * Get pre-key bundle for user
   */
  async getPreKeyBundle(
    userId: string,
    deviceId: number
  ): Promise<PreKeyBundle | null> {
    // Get identity key
    const identityKey = await this.getIdentityKey(userId, deviceId);
    if (!identityKey) {
      return null;
    }

    // Get signed pre-key
    const signedPreKey = await signedPreKeyRotation.getActiveSignedPreKey(
      userId,
      deviceId
    );
    if (!signedPreKey) {
      return null;
    }

    // Get one-time pre-key (optional)
    const preKey = await preKeyManager.consumePreKey(userId, deviceId);

    const bundle: PreKeyBundle = {
      registration_id: identityKey.registration_id,
      device_id: deviceId,
      identity_key: identityKey.public_key,
      signed_pre_key: {
        id: signedPreKey.key_id,
        public_key: signedPreKey.public_key,
        signature: signedPreKey.signature,
      },
    };

    if (preKey) {
      bundle.pre_key = {
        id: preKey.key_id,
        public_key: preKey.public_key,
      };
    }

    return bundle;
  }

  /**
   * Get identity key only
   */
  async getIdentityKey(
    userId: string,
    deviceId: number
  ): Promise<IdentityKeyRecord | null> {
    const key = this.makeIdentityKey(userId, deviceId);
    return this.identityKeys.get(key) || null;
  }

  /**
   * Get pre-key count
   */
  async getPreKeyCount(
    userId: string,
    deviceId: number
  ): Promise<number> {
    return preKeyManager.getAvailableCount(userId, deviceId);
  }

  /**
   * Check if replenishment needed
   */
  async needsPreKeyReplenishment(
    userId: string,
    deviceId: number
  ): Promise<boolean> {
    return preKeyManager.needsReplenishment(userId, deviceId);
  }

  /**
   * Check if signed pre-key rotation needed
   */
  async needsSignedPreKeyRotation(
    userId: string,
    deviceId: number
  ): Promise<boolean> {
    return signedPreKeyRotation.needsRotation(userId, deviceId);
  }

  /**
   * Delete all keys for device
   */
  async deleteDeviceKeys(
    userId: string,
    deviceId: number
  ): Promise<void> {
    // Delete identity key
    const identityKey = this.makeIdentityKey(userId, deviceId);
    this.identityKeys.delete(identityKey);

    // Delete pre-keys
    await preKeyManager.deleteAllPreKeys(userId, deviceId);

    // Delete signed pre-keys
    await signedPreKeyRotation.deleteAllSignedPreKeys(userId, deviceId);
  }

  /**
   * Get all devices for user
   */
  async getUserDevices(userId: string): Promise<number[]> {
    const devices: number[] = [];

    for (const record of this.identityKeys.values()) {
      if (record.user_id === userId) {
        devices.push(record.device_id);
      }
    }

    return devices;
  }

  /**
   * Make identity key storage key
   */
  private makeIdentityKey(userId: string, deviceId: number): string {
    return `${userId}:${deviceId}`;
  }
}

export const keyServer = new KeyServer();
