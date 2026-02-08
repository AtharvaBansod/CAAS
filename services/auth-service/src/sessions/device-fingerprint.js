"use strict";
/**
 * Device Fingerprint
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Generates and validates device fingerprints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceFingerprint = void 0;
const crypto_1 = require("crypto");
class DeviceFingerprint {
    /**
     * Generate device fingerprint from components
     */
    static generate(components) {
        const parts = [
            components.userAgent || '',
            components.screenResolution || '',
            components.timezone || '',
            components.language || '',
            components.platform || '',
        ];
        const combined = parts.join('|');
        return (0, crypto_1.createHash)('sha256').update(combined).digest('hex');
    }
    /**
     * Generate fingerprint from device info
     */
    static fromDeviceInfo(deviceInfo) {
        const components = {
            userAgent: deviceInfo.user_agent,
            platform: deviceInfo.os,
        };
        return this.generate(components);
    }
    /**
     * Match fingerprints with tolerance
     */
    static match(fingerprint1, fingerprint2) {
        return fingerprint1 === fingerprint2;
    }
    /**
     * Validate fingerprint format
     */
    static isValid(fingerprint) {
        // SHA-256 hash is 64 hex characters
        return /^[a-f0-9]{64}$/i.test(fingerprint);
    }
    /**
     * Parse User-Agent string
     */
    static parseUserAgent(userAgent) {
        const result = {};
        // Detect OS
        if (/Windows/i.test(userAgent)) {
            result.os = 'Windows';
        }
        else if (/Mac OS X/i.test(userAgent)) {
            result.os = 'macOS';
        }
        else if (/Linux/i.test(userAgent)) {
            result.os = 'Linux';
        }
        else if (/Android/i.test(userAgent)) {
            result.os = 'Android';
        }
        else if (/iOS|iPhone|iPad/i.test(userAgent)) {
            result.os = 'iOS';
        }
        // Detect Browser
        if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
            result.browser = 'Chrome';
        }
        else if (/Firefox/i.test(userAgent)) {
            result.browser = 'Firefox';
        }
        else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
            result.browser = 'Safari';
        }
        else if (/Edge/i.test(userAgent)) {
            result.browser = 'Edge';
        }
        // Detect Device
        if (/Mobile/i.test(userAgent)) {
            result.device = 'mobile';
        }
        else if (/Tablet/i.test(userAgent)) {
            result.device = 'tablet';
        }
        else {
            result.device = 'desktop';
        }
        return result;
    }
    /**
     * Create device info from User-Agent
     */
    static createDeviceInfo(userAgent, appVersion) {
        const parsed = this.parseUserAgent(userAgent);
        return {
            type: this.mapDeviceType(parsed.device),
            os: parsed.os || 'Unknown',
            browser: parsed.browser,
            app_version: appVersion,
            user_agent: userAgent,
        };
    }
    /**
     * Map device string to DeviceInfo type
     */
    static mapDeviceType(device) {
        switch (device) {
            case 'mobile':
                return 'mobile';
            case 'tablet':
                return 'mobile';
            case 'desktop':
                return 'desktop';
            default:
                return 'web';
        }
    }
}
exports.DeviceFingerprint = DeviceFingerprint;
//# sourceMappingURL=device-fingerprint.js.map