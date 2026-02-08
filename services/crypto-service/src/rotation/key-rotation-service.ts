/**
 * Key Rotation Service
 * Main service for key rotation operations
 */

import { keyVault } from '../storage/key-vault';
import { keyGenerator } from '../keys/key-generator';
import { keyRevocationService } from './key-revocation';
import { scheduledRotation } from './scheduled-rotation';
import { reEncryptionJobService } from './re-encryption-job';
import { rotationAudit } from './rotation-audit';
import {
  KeyRotationResult,
  RotationReason,
  RotationStatus,
  RevocationReason,
} from './types';

export class KeyRotationService {
  /**
   * Rotate identity key
   */
  async rotateIdentityKey(
    userId: string,
    tenantId: string,
    reason: RotationReason = 'MANUAL'
  ): Promise<KeyRotationResult> {
    // Generate new identity key pair
    const newKeyPair = await keyGenerator.generateIdentityKeyPair();

    // Store new key
    const newKeyId = await keyVault.storeKey({
      user_id: userId,
      tenant_id: tenantId,
      key_type: 'identity',
      key_material: newKeyPair.privateKey,
    });

    // Get old key ID (simplified - in production, fetch from storage)
    const oldKeyId = 'old_identity_key_id';

    // Revoke old key
    await keyRevocationService.revokeKey(
      oldKeyId,
      userId,
      tenantId,
      'identity',
      'SUPERSEDED'
    );

    // Log rotation
    await rotationAudit.logRotation(
      userId,
      tenantId,
      'identity',
      oldKeyId,
      newKeyId,
      reason
    );

    // TODO: Notify contacts of key change
    // TODO: Update pre-key signatures

    return {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      rotated_at: new Date(),
      reason,
    };
  }

  /**
   * Rotate signed pre-key
   */
  async rotateSignedPreKey(
    userId: string,
    tenantId: string,
    identityPrivateKey: Buffer,
    keyId: number
  ): Promise<void> {
    // Generate new signed pre-key
    const signedPreKey = await keyGenerator.generateSignedPreKey(
      { key: identityPrivateKey },
      keyId
    );

    // Store new signed pre-key
    await keyVault.storeKey({
      user_id: userId,
      tenant_id: tenantId,
      key_type: 'signed_pre_key',
      key_material: signedPreKey.privateKey!,
      metadata: {
        key_id: signedPreKey.keyId,
        signature: signedPreKey.signature.toString('base64'),
        timestamp: signedPreKey.timestamp,
      },
    });

    // Log rotation
    await rotationAudit.logRotation(
      userId,
      tenantId,
      'signed_pre_key',
      `spk_${keyId - 1}`,
      `spk_${keyId}`,
      'SCHEDULED'
    );
  }

  /**
   * Rotate master key (critical operation)
   */
  async rotateMasterKey(): Promise<void> {
    // This is a critical operation that requires:
    // 1. Generate new master key
    // 2. Re-encrypt all tenant keys
    // 3. Update master key provider
    // 4. Verify all re-encryptions
    
    throw new Error('Master key rotation requires manual intervention');
  }

  /**
   * Revoke key
   */
  async revokeKey(
    keyId: string,
    userId: string,
    tenantId: string,
    reason: RevocationReason
  ): Promise<void> {
    await keyRevocationService.revokeKey(
      keyId,
      userId,
      tenantId,
      'unknown', // In production, fetch key type
      reason
    );

    // If compromise, force disconnect all sessions
    if (reason === 'KEY_COMPROMISE') {
      await this.handleCompromise(userId, tenantId);
    }
  }

  /**
   * Get rotation status
   */
  async getRotationStatus(
    userId: string,
    tenantId: string
  ): Promise<RotationStatus> {
    const stats = await rotationAudit.getRotationStats(userId, tenantId);

    // Calculate next scheduled rotation
    const lastRotation = stats.last_rotation || new Date();
    const nextScheduled = scheduledRotation.getNextRotationDate(
      'signed_pre_key',
      lastRotation
    );

    // Check if overdue
    const isOverdue = scheduledRotation.isRotationDue(
      'signed_pre_key',
      lastRotation
    );

    return {
      user_id: userId,
      tenant_id: tenantId,
      last_rotation: stats.last_rotation || null,
      next_scheduled_rotation: nextScheduled,
      rotation_count: stats.total_rotations,
      is_overdue: isOverdue,
    };
  }

  /**
   * Handle key compromise
   */
  private async handleCompromise(
    userId: string,
    tenantId: string
  ): Promise<void> {
    // Emergency rotation
    await this.rotateIdentityKey(userId, tenantId, 'EMERGENCY');

    // TODO: Force disconnect all sessions
    // TODO: Invalidate all tokens
    // TODO: Notify security team
  }

  /**
   * Schedule automatic rotation
   */
  async scheduleAutomaticRotation(
    userId: string,
    tenantId: string,
    keyType: string
  ): Promise<void> {
    await scheduledRotation.scheduleRotation(
      keyType,
      userId,
      async () => {
        // Perform rotation based on key type
        if (keyType === 'signed_pre_key') {
          // TODO: Get identity private key
          // await this.rotateSignedPreKey(userId, tenantId, identityPrivateKey, newKeyId);
        }
      }
    );
  }
}

export const keyRotationService = new KeyRotationService();
