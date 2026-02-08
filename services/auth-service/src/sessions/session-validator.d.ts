/**
 * Session Validator
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Validates session state and security
 */
import { Session, SessionValidation } from './types';
export interface ValidationOptions {
    checkExpiry?: boolean;
    checkActive?: boolean;
    checkIpAddress?: boolean;
    checkDeviceFingerprint?: boolean;
    strictMode?: boolean;
}
export declare class SessionValidator {
    /**
     * Validate session
     */
    validate(session: Session, options?: ValidationOptions): Promise<SessionValidation>;
    /**
     * Validate IP address match
     */
    validateIpAddress(session: Session, currentIp: string, strictMode?: boolean): boolean;
    /**
     * Validate device fingerprint
     */
    validateDeviceFingerprint(session: Session, currentFingerprint: string): boolean;
    /**
     * Check if session needs renewal
     */
    needsRenewal(session: Session, renewalThresholdMs?: number): boolean;
    /**
     * Check if session is idle
     */
    isIdle(session: Session, idleThresholdMs?: number): boolean;
    /**
     * Validate session age
     */
    validateAge(session: Session, maxAgeMs: number): boolean;
    /**
     * Get session health score (0-100)
     */
    getHealthScore(session: Session): number;
}
