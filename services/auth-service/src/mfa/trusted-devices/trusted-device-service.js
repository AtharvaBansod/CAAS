"use strict";
/**
 * Trusted Device Service
 * Phase 2 - Authentication - Task AUTH-011
 *
 * Manages trusted devices for MFA bypass
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustedDeviceService = void 0;
const crypto_1 = require("crypto");
class TrustedDeviceService {
    storage;
    trustExpiryDays;
    maxTrustedDevices;
    constructor(storage, trustExpiryDays = 30, maxTrustedDevices = 10) {
        this.storage = storage;
        this.trustExpiryDays = trustExpiryDays;
        this.maxTrustedDevices = maxTrustedDevices;
    }
    /**
     * Trust a device
     */
    async trustDevice(userId, deviceId, deviceName, fingerprint) {
        // Check device limit
        const devices = await this.storage.getTrustedDevices(userId);
        if (devices.length >= this.maxTrustedDevices) {
            // Remove oldest device
            const oldest = devices.reduce((prev, current) => prev.trusted_at < current.trusted_at ? prev : current);
            await this.storage.removeTrust(userId, oldest.device_id);
        }
        // Create trust token
        const token = this.generateTrustToken();
        const expiresAt = Date.now() + this.trustExpiryDays * 24 * 60 * 60 * 1000;
        // Store trusted device
        await this.storage.trustDevice(userId, {
            device_id: deviceId,
            device_name: deviceName,
            fingerprint_hash: fingerprint,
            trusted_at: Date.now(),
            expires_at: expiresAt,
            last_used: Date.now(),
        });
        return {
            token,
            device_id: deviceId,
            expires_at: expiresAt,
        };
    }
    /**
     * Verify trust token
     */
    async verifyTrust(userId, deviceId, fingerprint) {
        const device = await this.storage.getTrustedDevice(userId, deviceId);
        if (!device) {
            return false;
        }
        // Check expiry
        if (Date.now() >= device.expires_at) {
            await this.storage.removeTrust(userId, deviceId);
            return false;
        }
        // Check fingerprint
        if (device.fingerprint_hash !== fingerprint) {
            return false;
        }
        // Update last used
        await this.storage.updateLastUsed(userId, deviceId);
        return true;
    }
    /**
     * Remove trust from device
     */
    async removeTrust(userId, deviceId) {
        await this.storage.removeTrust(userId, deviceId);
    }
    /**
     * Remove all trusted devices
     */
    async removeAllTrust(userId) {
        await this.storage.removeAllTrust(userId);
    }
    /**
     * Get trusted devices
     */
    async getTrustedDevices(userId) {
        return await this.storage.getTrustedDevices(userId);
    }
    /**
     * Check if device is trusted
     */
    async isTrusted(userId, deviceId) {
        const device = await this.storage.getTrustedDevice(userId, deviceId);
        if (!device) {
            return false;
        }
        // Check expiry
        if (Date.now() >= device.expires_at) {
            await this.storage.removeTrust(userId, deviceId);
            return false;
        }
        return true;
    }
    /**
     * Generate trust token
     */
    generateTrustToken() {
        return (0, crypto_1.randomBytes)(32).toString('hex');
    }
    /**
     * Get trust expiry days
     */
    getTrustExpiryDays() {
        return this.trustExpiryDays;
    }
    /**
     * Get max trusted devices
     */
    getMaxTrustedDevices() {
        return this.maxTrustedDevices;
    }
}
exports.TrustedDeviceService = TrustedDeviceService;
//# sourceMappingURL=trusted-device-service.js.map