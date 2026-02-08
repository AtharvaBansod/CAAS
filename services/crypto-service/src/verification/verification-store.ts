/**
 * Verification Store
 * Manages verification status between user pairs
 */

import { VerificationRecord } from './types';

export class VerificationStore {
  private verifications: Map<string, VerificationRecord> = new Map();

  /**
   * Mark conversation as verified
   */
  async markAsVerified(
    user1Id: string,
    user2Id: string,
    verifiedBy: string
  ): Promise<void> {
    const key = this.makeKey(user1Id, user2Id);

    const record: VerificationRecord = {
      user1_id: user1Id,
      user2_id: user2Id,
      verified_at: new Date(),
      verified_by: verifiedBy,
      is_verified: true,
    };

    this.verifications.set(key, record);
  }

  /**
   * Remove verification
   */
  async removeVerification(user1Id: string, user2Id: string): Promise<void> {
    const key = this.makeKey(user1Id, user2Id);
    this.verifications.delete(key);
  }

  /**
   * Check if conversation is verified
   */
  async isVerified(user1Id: string, user2Id: string): Promise<boolean> {
    const key = this.makeKey(user1Id, user2Id);
    const record = this.verifications.get(key);

    return record?.is_verified || false;
  }

  /**
   * Get verification record
   */
  async getVerification(
    user1Id: string,
    user2Id: string
  ): Promise<VerificationRecord | null> {
    const key = this.makeKey(user1Id, user2Id);
    return this.verifications.get(key) || null;
  }

  /**
   * Get all verifications for user
   */
  async getUserVerifications(userId: string): Promise<VerificationRecord[]> {
    const userVerifications: VerificationRecord[] = [];

    for (const record of this.verifications.values()) {
      if (record.user1_id === userId || record.user2_id === userId) {
        userVerifications.push(record);
      }
    }

    return userVerifications;
  }

  /**
   * Invalidate verification (on key change)
   */
  async invalidateVerification(
    user1Id: string,
    user2Id: string
  ): Promise<void> {
    const key = this.makeKey(user1Id, user2Id);
    const record = this.verifications.get(key);

    if (record) {
      record.is_verified = false;
      this.verifications.set(key, record);
    }
  }

  /**
   * Invalidate all verifications for user (on key change)
   */
  async invalidateUserVerifications(userId: string): Promise<number> {
    let count = 0;

    for (const [key, record] of this.verifications.entries()) {
      if (record.user1_id === userId || record.user2_id === userId) {
        record.is_verified = false;
        this.verifications.set(key, record);
        count++;
      }
    }

    return count;
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(userId: string): Promise<{
    total_verifications: number;
    active_verifications: number;
    invalidated_verifications: number;
  }> {
    const userVerifications = await this.getUserVerifications(userId);

    const active = userVerifications.filter(v => v.is_verified).length;
    const invalidated = userVerifications.filter(v => !v.is_verified).length;

    return {
      total_verifications: userVerifications.length,
      active_verifications: active,
      invalidated_verifications: invalidated,
    };
  }

  /**
   * Make storage key (order-independent)
   */
  private makeKey(user1Id: string, user2Id: string): string {
    return user1Id < user2Id
      ? `${user1Id}:${user2Id}`
      : `${user2Id}:${user1Id}`;
  }
}

export const verificationStore = new VerificationStore();
