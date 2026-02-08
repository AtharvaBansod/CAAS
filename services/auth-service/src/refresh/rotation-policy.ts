/**
 * Refresh Token Rotation Policy
 * Phase 2 - Authentication - Task AUTH-003
 * 
 * Implements token rotation strategies
 */

import { RotationPolicy } from './types';

export class TokenRotationPolicy {
  constructor(private policy: RotationPolicy) {}

  /**
   * Check if rotation is enabled
   */
  isRotationEnabled(): boolean {
    return this.policy.enabled;
  }

  /**
   * Check if reuse detection is enabled
   */
  isReuseDetectionEnabled(): boolean {
    return this.policy.reuseDetection;
  }

  /**
   * Check if family revocation is enabled on reuse
   */
  shouldRevokeFamilyOnReuse(): boolean {
    return this.policy.revokeFamily;
  }

  /**
   * Determine if token should be rotated
   */
  shouldRotate(tokenAge: number, lastUsed: number): boolean {
    if (!this.policy.enabled) {
      return false;
    }

    // Always rotate on use when rotation is enabled
    return true;
  }

  /**
   * Get rotation strategy
   */
  getRotationStrategy(): 'always' | 'conditional' | 'never' {
    if (!this.policy.enabled) {
      return 'never';
    }

    // Currently always rotate when enabled
    // Can be extended to support conditional rotation
    return 'always';
  }

  /**
   * Validate rotation policy configuration
   */
  validate(): void {
    if (this.policy.revokeFamily && !this.policy.reuseDetection) {
      throw new Error(
        'Cannot revoke family on reuse without reuse detection enabled'
      );
    }
  }

  /**
   * Get policy configuration
   */
  getPolicy(): RotationPolicy {
    return { ...this.policy };
  }

  /**
   * Update policy
   */
  updatePolicy(updates: Partial<RotationPolicy>): void {
    this.policy = { ...this.policy, ...updates };
    this.validate();
  }
}

/**
 * Create default rotation policy
 */
export function createDefaultRotationPolicy(): TokenRotationPolicy {
  const policy: RotationPolicy = {
    enabled: process.env.REFRESH_TOKEN_ROTATION !== 'false',
    reuseDetection: process.env.REFRESH_TOKEN_REUSE_DETECTION !== 'false',
    revokeFamily: true,
  };

  return new TokenRotationPolicy(policy);
}
