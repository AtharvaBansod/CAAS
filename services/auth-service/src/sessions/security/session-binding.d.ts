/**
 * Session Binding
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Binds sessions to device fingerprint, IP, and location
 */
import { Session } from '../types';
import { SessionBindingLevel } from './types';
export declare class SessionBinding {
    private bindingLevel;
    constructor(bindingLevel: SessionBindingLevel);
    /**
     * Validate session binding
     */
    validate(session: Session, currentIp: string, currentFingerprint?: string, currentLocation?: {
        country: string;
    }): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Validate device fingerprint only
     */
    private validateDevice;
    /**
     * Validate device and IP subnet
     */
    private validateIpAndDevice;
    /**
     * Validate device, exact IP, and region
     */
    private validateStrict;
    /**
     * Check if IPs are in same subnet
     */
    private isSameSubnet;
    /**
     * Get binding level
     */
    getBindingLevel(): SessionBindingLevel;
    /**
     * Set binding level
     */
    setBindingLevel(level: SessionBindingLevel): void;
}
