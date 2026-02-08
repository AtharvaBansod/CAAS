/**
 * Refresh Token Reuse Detection
 * Phase 2 - Authentication - Task AUTH-003
 * 
 * Detects and handles refresh token reuse attacks
 */

import { RefreshTokenStore } from './refresh-token-store';
import { FamilyTracker } from './family-tracker';
import { RefreshTokenData } from './types';

export interface ReuseDetectionResult {
  isReuse: boolean;
  action: 'allow' | 'revoke_family' | 'alert';
  reason?: string;
}

export class ReuseDetector {
  constructor(
    private tokenStore: RefreshTokenStore,
    private familyTracker: FamilyTracker
  ) {}

  /**
   * Detect if a refresh token is being reused
   */
  async detectReuse(token: string, tokenData: RefreshTokenData): Promise<ReuseDetectionResult> {
    // Check if token has already been used
    if (tokenData.used) {
      return {
        isReuse: true,
        action: 'revoke_family',
        reason: 'Token has already been used',
      };
    }

    // Check if token is revoked
    if (tokenData.revoked) {
      return {
        isReuse: true,
        action: 'revoke_family',
        reason: 'Token has been revoked',
      };
    }

    // Check if family is revoked
    const isFamilyRevoked = await this.familyTracker.isFamilyRevoked(tokenData.family_id);
    if (isFamilyRevoked) {
      return {
        isReuse: true,
        action: 'revoke_family',
        reason: 'Token family has been revoked',
      };
    }

    // No reuse detected
    return {
      isReuse: false,
      action: 'allow',
    };
  }

  /**
   * Handle detected reuse
   */
  async handleReuse(
    token: string,
    tokenData: RefreshTokenData,
    reuseResult: ReuseDetectionResult
  ): Promise<void> {
    if (!reuseResult.isReuse) {
      return;
    }

    switch (reuseResult.action) {
      case 'revoke_family':
        await this.revokeFamilyAndAlert(tokenData, reuseResult.reason);
        break;

      case 'alert':
        await this.alertSecurityEvent(tokenData, reuseResult.reason);
        break;
    }
  }

  /**
   * Revoke entire token family and alert user
   */
  private async revokeFamilyAndAlert(
    tokenData: RefreshTokenData,
    reason?: string
  ): Promise<void> {
    // Revoke the family
    await this.familyTracker.revokeFamily(tokenData.family_id);

    // Revoke all user tokens in this family
    await this.tokenStore.revokeAllUserTokens(tokenData.user_id);

    // Log security event
    console.error('SECURITY: Refresh token reuse detected', {
      user_id: tokenData.user_id,
      family_id: tokenData.family_id,
      session_id: tokenData.session_id,
      reason,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send alert to user (email/push notification)
    // TODO: Publish security event to Kafka
  }

  /**
   * Alert about security event without revoking
   */
  private async alertSecurityEvent(
    tokenData: RefreshTokenData,
    reason?: string
  ): Promise<void> {
    console.warn('SECURITY: Suspicious refresh token activity', {
      user_id: tokenData.user_id,
      family_id: tokenData.family_id,
      session_id: tokenData.session_id,
      reason,
      timestamp: new Date().toISOString(),
    });

    // TODO: Publish security event to Kafka
  }

  /**
   * Check for anomalous refresh patterns
   */
  async checkRefreshPattern(userId: string): Promise<{
    suspicious: boolean;
    reason?: string;
  }> {
    // Get user's token families
    const families = await this.familyTracker.getUserFamilies(userId);

    // Check for too many families (possible attack)
    if (families.length > 10) {
      return {
        suspicious: true,
        reason: 'Too many active token families',
      };
    }

    // Check for rapid family creation
    const recentFamilies = families.filter(
      f => Date.now() - f.created_at < 60 * 60 * 1000 // Last hour
    );

    if (recentFamilies.length > 5) {
      return {
        suspicious: true,
        reason: 'Rapid token family creation',
      };
    }

    return { suspicious: false };
  }

  /**
   * Validate token chain integrity
   */
  async validateTokenChain(tokenData: RefreshTokenData): Promise<boolean> {
    // If this is the first token in the family, it's valid
    if (!tokenData.parent_id) {
      return true;
    }

    // Check if parent token exists in the family
    const isParentInFamily = await this.familyTracker.isTokenInFamily(
      tokenData.family_id,
      tokenData.parent_id
    );

    return isParentInFamily;
  }

  /**
   * Get reuse statistics
   */
  async getReuseStats(): Promise<{
    totalFamilies: number;
    revokedFamilies: number;
    reuseDetectionRate: number;
  }> {
    const stats = await this.familyTracker.getFamilyStats();

    return {
      totalFamilies: stats.totalFamilies,
      revokedFamilies: stats.revokedFamilies,
      reuseDetectionRate:
        stats.totalFamilies > 0
          ? stats.revokedFamilies / stats.totalFamilies
          : 0,
    };
  }
}
