/**
 * Safety Number Service
 * Main service for safety number generation and verification
 */

import { safetyNumberGenerator } from './safety-number-generator';
import { qrCodeGenerator } from './qr-code';
import { verificationStore } from './verification-store';
import { keyChangeDetector } from './key-change-detector';
import { SafetyNumber } from './types';

export class SafetyNumberService {
  /**
   * Generate safety number for conversation
   */
  async generateSafetyNumber(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): Promise<SafetyNumber> {
    const safetyNumber = safetyNumberGenerator.generate(
      user1Id,
      user1IdentityKey,
      user2Id,
      user2IdentityKey
    );

    return {
      user1_id: user1Id,
      user2_id: user2Id,
      safety_number: safetyNumber,
      generated_at: new Date(),
    };
  }

  /**
   * Generate QR code for verification
   */
  async generateQRCode(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer,
    format: 'svg' | 'png' = 'svg'
  ): Promise<string> {
    if (format === 'svg') {
      return qrCodeGenerator.generateSVG(
        user1Id,
        user1IdentityKey,
        user2Id,
        user2IdentityKey
      );
    } else {
      return qrCodeGenerator.generatePNG(
        user1Id,
        user1IdentityKey,
        user2Id,
        user2IdentityKey
      );
    }
  }

  /**
   * Verify safety number
   */
  async verifySafetyNumber(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer,
    providedSafetyNumber: string
  ): Promise<boolean> {
    const generated = safetyNumberGenerator.generate(
      user1Id,
      user1IdentityKey,
      user2Id,
      user2IdentityKey
    );

    return safetyNumberGenerator.compare(generated, providedSafetyNumber);
  }

  /**
   * Mark conversation as verified
   */
  async markAsVerified(
    user1Id: string,
    user2Id: string,
    verifiedBy: string
  ): Promise<void> {
    await verificationStore.markAsVerified(user1Id, user2Id, verifiedBy);
  }

  /**
   * Remove verification
   */
  async removeVerification(user1Id: string, user2Id: string): Promise<void> {
    await verificationStore.removeVerification(user1Id, user2Id);
  }

  /**
   * Check if conversation is verified
   */
  async isVerified(user1Id: string, user2Id: string): Promise<boolean> {
    return verificationStore.isVerified(user1Id, user2Id);
  }

  /**
   * Handle identity key change
   */
  async handleKeyChange(
    userId: string,
    deviceId: number,
    oldIdentityKey: Buffer,
    newIdentityKey: Buffer
  ): Promise<void> {
    await keyChangeDetector.detectKeyChange(
      userId,
      deviceId,
      oldIdentityKey,
      newIdentityKey
    );
  }

  /**
   * Get pending key change notifications
   */
  async getPendingKeyChanges(userId: string): Promise<any[]> {
    return keyChangeDetector.getKeyChangeEvents(userId);
  }

  /**
   * Acknowledge key change
   */
  async acknowledgeKeyChange(
    userId: string,
    changedUserId: string,
    timestamp: Date
  ): Promise<void> {
    await keyChangeDetector.acknowledgeKeyChange(
      userId,
      changedUserId,
      timestamp
    );
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(
    user1Id: string,
    user2Id: string
  ): Promise<{
    is_verified: boolean;
    verified_at?: Date;
    has_key_change: boolean;
  }> {
    const isVerified = await verificationStore.isVerified(user1Id, user2Id);
    const verification = await verificationStore.getVerification(
      user1Id,
      user2Id
    );

    // Check for recent key changes
    const hasKeyChange =
      (await keyChangeDetector.hasRecentKeyChange(user1Id)) ||
      (await keyChangeDetector.hasRecentKeyChange(user2Id));

    return {
      is_verified: isVerified,
      verified_at: verification?.verified_at,
      has_key_change: hasKeyChange,
    };
  }

  /**
   * Compare safety numbers
   */
  compareSafetyNumbers(
    safetyNumber1: string,
    safetyNumber2: string
  ): boolean {
    return safetyNumberGenerator.compare(safetyNumber1, safetyNumber2);
  }

  /**
   * Format safety number for display
   */
  formatSafetyNumber(safetyNumber: string): string {
    return safetyNumberGenerator.format(safetyNumber);
  }

  /**
   * Validate safety number format
   */
  validateSafetyNumber(safetyNumber: string): boolean {
    return safetyNumberGenerator.validate(safetyNumber);
  }
}

export const safetyNumberService = new SafetyNumberService();
