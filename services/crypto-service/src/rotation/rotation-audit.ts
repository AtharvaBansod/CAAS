/**
 * Rotation Audit
 * Audit logging for key rotations
 */

import { randomBytes } from 'crypto';
import { KeyRotationRecord, RotationReason } from './types';

export class RotationAudit {
  private rotations: KeyRotationRecord[] = [];

  /**
   * Log key rotation
   */
  async logRotation(
    userId: string,
    tenantId: string,
    keyType: string,
    oldKeyId: string,
    newKeyId: string,
    reason: RotationReason,
    rotatedBy?: string
  ): Promise<void> {
    const record: KeyRotationRecord = {
      rotation_id: randomBytes(16).toString('hex'),
      user_id: userId,
      tenant_id: tenantId,
      key_type: keyType,
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
      reason,
      rotated_at: new Date(),
      rotated_by: rotatedBy,
    };

    this.rotations.push(record);

    // In production, persist to database
    // await this.persistRotation(record);
  }

  /**
   * Get rotation history for user
   */
  async getRotationHistory(
    userId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<KeyRotationRecord[]> {
    return this.rotations
      .filter(r => r.user_id === userId && r.tenant_id === tenantId)
      .slice(-limit);
  }

  /**
   * Get rotation history for key type
   */
  async getKeyTypeHistory(
    keyType: string,
    limit: number = 50
  ): Promise<KeyRotationRecord[]> {
    return this.rotations
      .filter(r => r.key_type === keyType)
      .slice(-limit);
  }

  /**
   * Get rotation statistics
   */
  async getRotationStats(
    userId: string,
    tenantId: string
  ): Promise<{
    total_rotations: number;
    by_reason: Record<RotationReason, number>;
    by_key_type: Record<string, number>;
    last_rotation?: Date;
  }> {
    const userRotations = await this.getRotationHistory(userId, tenantId, 1000);

    const byReason: Record<string, number> = {};
    const byKeyType: Record<string, number> = {};

    for (const rotation of userRotations) {
      byReason[rotation.reason] = (byReason[rotation.reason] || 0) + 1;
      byKeyType[rotation.key_type] = (byKeyType[rotation.key_type] || 0) + 1;
    }

    return {
      total_rotations: userRotations.length,
      by_reason: byReason as Record<RotationReason, number>,
      by_key_type: byKeyType,
      last_rotation: userRotations.length > 0 
        ? userRotations[userRotations.length - 1].rotated_at 
        : undefined,
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_rotations: number;
    scheduled_rotations: number;
    manual_rotations: number;
    emergency_rotations: number;
    users_rotated: number;
  }> {
    const rotations = this.rotations.filter(
      r => r.tenant_id === tenantId &&
           r.rotated_at >= startDate &&
           r.rotated_at <= endDate
    );

    const uniqueUsers = new Set(rotations.map(r => r.user_id));

    return {
      total_rotations: rotations.length,
      scheduled_rotations: rotations.filter(r => r.reason === 'SCHEDULED').length,
      manual_rotations: rotations.filter(r => r.reason === 'MANUAL').length,
      emergency_rotations: rotations.filter(r => r.reason === 'EMERGENCY').length,
      users_rotated: uniqueUsers.size,
    };
  }

  /**
   * Get recent rotations
   */
  async getRecentRotations(hours: number = 24): Promise<KeyRotationRecord[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.rotations.filter(r => r.rotated_at >= cutoff);
  }

  /**
   * Cleanup old audit logs
   */
  async cleanupOldLogs(daysOld: number = 365): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const before = this.rotations.length;
    this.rotations = this.rotations.filter(r => r.rotated_at >= cutoff);

    return before - this.rotations.length;
  }
}

export const rotationAudit = new RotationAudit();
