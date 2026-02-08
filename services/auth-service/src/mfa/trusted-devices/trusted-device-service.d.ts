/**
 * Trusted Device Service
 * Phase 2 - Authentication - Task AUTH-011
 *
 * Manages trusted devices for MFA bypass
 */
import { TrustedDevice } from '../types';
import { TrustStorage } from './trust-storage';
export interface TrustToken {
    token: string;
    device_id: string;
    expires_at: number;
}
export declare class TrustedDeviceService {
    private storage;
    private trustExpiryDays;
    private maxTrustedDevices;
    constructor(storage: TrustStorage, trustExpiryDays?: number, maxTrustedDevices?: number);
    /**
     * Trust a device
     */
    trustDevice(userId: string, deviceId: string, deviceName: string, fingerprint: string): Promise<TrustToken>;
    /**
     * Verify trust token
     */
    verifyTrust(userId: string, deviceId: string, fingerprint: string): Promise<boolean>;
    /**
     * Remove trust from device
     */
    removeTrust(userId: string, deviceId: string): Promise<void>;
    /**
     * Remove all trusted devices
     */
    removeAllTrust(userId: string): Promise<void>;
    /**
     * Get trusted devices
     */
    getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
    /**
     * Check if device is trusted
     */
    isTrusted(userId: string, deviceId: string): Promise<boolean>;
    /**
     * Generate trust token
     */
    private generateTrustToken;
    /**
     * Get trust expiry days
     */
    getTrustExpiryDays(): number;
    /**
     * Get max trusted devices
     */
    getMaxTrustedDevices(): number;
}
