/**
 * Device Fingerprint
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Generates and validates device fingerprints
 */
import { DeviceInfo } from './types';
export interface FingerprintComponents {
    userAgent: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
}
export declare class DeviceFingerprint {
    /**
     * Generate device fingerprint from components
     */
    static generate(components: FingerprintComponents): string;
    /**
     * Generate fingerprint from device info
     */
    static fromDeviceInfo(deviceInfo: DeviceInfo): string;
    /**
     * Match fingerprints with tolerance
     */
    static match(fingerprint1: string, fingerprint2: string): boolean;
    /**
     * Validate fingerprint format
     */
    static isValid(fingerprint: string): boolean;
    /**
     * Parse User-Agent string
     */
    static parseUserAgent(userAgent: string): {
        browser?: string;
        os?: string;
        device?: string;
    };
    /**
     * Create device info from User-Agent
     */
    static createDeviceInfo(userAgent: string, appVersion?: string): DeviceInfo;
    /**
     * Map device string to DeviceInfo type
     */
    private static mapDeviceType;
}
