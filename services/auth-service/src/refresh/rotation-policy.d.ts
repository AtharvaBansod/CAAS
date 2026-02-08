/**
 * Refresh Token Rotation Policy
 * Phase 2 - Authentication - Task AUTH-003
 *
 * Implements token rotation strategies
 */
import { RotationPolicy } from './types';
export declare class TokenRotationPolicy {
    private policy;
    constructor(policy: RotationPolicy);
    /**
     * Check if rotation is enabled
     */
    isRotationEnabled(): boolean;
    /**
     * Check if reuse detection is enabled
     */
    isReuseDetectionEnabled(): boolean;
    /**
     * Check if family revocation is enabled on reuse
     */
    shouldRevokeFamilyOnReuse(): boolean;
    /**
     * Determine if token should be rotated
     */
    shouldRotate(tokenAge: number, lastUsed: number): boolean;
    /**
     * Get rotation strategy
     */
    getRotationStrategy(): 'always' | 'conditional' | 'never';
    /**
     * Validate rotation policy configuration
     */
    validate(): void;
    /**
     * Get policy configuration
     */
    getPolicy(): RotationPolicy;
    /**
     * Update policy
     */
    updatePolicy(updates: Partial<RotationPolicy>): void;
}
/**
 * Create default rotation policy
 */
export declare function createDefaultRotationPolicy(): TokenRotationPolicy;
