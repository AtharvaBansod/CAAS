/**
 * Key Revocation Service
 */

import { RevocationReason, RevokedKeyRecord } from './types';

export class KeyRevocationService {
  private revokedKeys: Map<string, RevokedKeyRecord> = new Map();

  /**
   * Revoke a key
   */
  async revokeKey(
    keyId: string,
    userId: string,
    tenantId: string,
    keyType: string,
    reason: RevocationReason,
    revokedBy?: string
  ): Promise<void> {
    const record: RevokedKeyRecord = {
      key_id: keyId,
      user_id: userId,
      tenant_id: tenantId,
      key_type: keyType,
      reason,
      revoked_at: new Date(),
      revoked_by: revokedBy,
    };

    this.revokedKeys.set(keyId, record);

    // Publish revocation event
    await this.publishRevocation(record);
  }

  /**
   * Check if key is revoked
   */
  async isRevoked(keyId: string): Promise<boolean> {
    return this.revokedKeys.has(keyId);
  }

  /**
   * Get revocation info
   */
  async getRevocationInfo(keyId: string): Promise<RevokedKeyRecord | null> {
    return this.revokedKeys.get(keyId) || null;
  }

  /**
   * Get all revoked keys for user
   */
  async getUserRevokedKeys(
    userId: string,
    tenantId: string
  ): Promise<RevokedKeyRecord[]> {
    const revoked: RevokedKeyRecord[] = [];

    for (const record of this.revokedKeys.values()) {
      if (record.user_id === userId && record.tenant_id === tenantId) {
        revoked.push(record);
      }
    }

    return revoked;
  }

  /**
   * Publish revocation to revocation list
   */
  private async publishRevocation(record: RevokedKeyRecord): Promise<void> {
    // TODO: Publish to Kafka for distribution
    console.log(`Key revoked: ${record.key_id}, reason: ${record.reason}`);
    
    // In production:
    // await kafkaProducer.send({
    //   topic: 'key-revocations',
    //   messages: [{
    //     key: record.key_id,
    //     value: JSON.stringify(record)
    //   }]
    // });
  }

  /**
   * Notify affected parties of revocation
   */
  async notifyRevocation(
    keyId: string,
    affectedUsers: string[]
  ): Promise<void> {
    const record = this.revokedKeys.get(keyId);
    if (!record) {
      return;
    }

    for (const userId of affectedUsers) {
      // TODO: Send notification via WebSocket/Kafka
      console.log(`Notifying ${userId} of key revocation: ${keyId}`);
    }
  }

  /**
   * Bulk revoke keys
   */
  async bulkRevokeKeys(
    keyIds: string[],
    userId: string,
    tenantId: string,
    keyType: string,
    reason: RevocationReason,
    revokedBy?: string
  ): Promise<number> {
    let count = 0;

    for (const keyId of keyIds) {
      await this.revokeKey(keyId, userId, tenantId, keyType, reason, revokedBy);
      count++;
    }

    return count;
  }

  /**
   * Get revocation statistics
   */
  async getRevocationStats(
    userId: string,
    tenantId: string
  ): Promise<{
    total_revoked: number;
    by_reason: Record<RevocationReason, number>;
    recent_revocations: number;
  }> {
    const userRevoked = await this.getUserRevokedKeys(userId, tenantId);
    
    const byReason: Record<string, number> = {};
    for (const record of userRevoked) {
      byReason[record.reason] = (byReason[record.reason] || 0) + 1;
    }

    // Count revocations in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentRevocations = userRevoked.filter(
      r => r.revoked_at > oneDayAgo
    ).length;

    return {
      total_revoked: userRevoked.length,
      by_reason: byReason as Record<RevocationReason, number>,
      recent_revocations: recentRevocations,
    };
  }

  /**
   * Cleanup old revocation records
   */
  async cleanupOldRevocations(daysOld: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    let count = 0;
    for (const [keyId, record] of this.revokedKeys.entries()) {
      if (record.revoked_at < cutoff) {
        this.revokedKeys.delete(keyId);
        count++;
      }
    }

    return count;
  }
}

export const keyRevocationService = new KeyRevocationService();
