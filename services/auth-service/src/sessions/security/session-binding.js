"use strict";
/**
 * Session Binding
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Binds sessions to device fingerprint, IP, and location
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionBinding = void 0;
const device_fingerprint_1 = require("../device-fingerprint");
const types_1 = require("./types");
class SessionBinding {
    bindingLevel;
    constructor(bindingLevel) {
        this.bindingLevel = bindingLevel;
    }
    /**
     * Validate session binding
     */
    validate(session, currentIp, currentFingerprint, currentLocation) {
        switch (this.bindingLevel) {
            case types_1.SessionBindingLevel.NONE:
                return { valid: true };
            case types_1.SessionBindingLevel.DEVICE:
                return this.validateDevice(session, currentFingerprint);
            case types_1.SessionBindingLevel.IP:
                return this.validateIpAndDevice(session, currentIp, currentFingerprint);
            case types_1.SessionBindingLevel.STRICT:
                return this.validateStrict(session, currentIp, currentFingerprint, currentLocation);
            default:
                return { valid: true };
        }
    }
    /**
     * Validate device fingerprint only
     */
    validateDevice(session, currentFingerprint) {
        if (!currentFingerprint) {
            return { valid: false, reason: 'Device fingerprint required' };
        }
        const sessionFingerprint = device_fingerprint_1.DeviceFingerprint.fromDeviceInfo(session.device_info);
        const matches = device_fingerprint_1.DeviceFingerprint.match(sessionFingerprint, currentFingerprint);
        if (!matches) {
            return { valid: false, reason: 'Device fingerprint mismatch' };
        }
        return { valid: true };
    }
    /**
     * Validate device and IP subnet
     */
    validateIpAndDevice(session, currentIp, currentFingerprint) {
        // Check device
        const deviceCheck = this.validateDevice(session, currentFingerprint);
        if (!deviceCheck.valid) {
            return deviceCheck;
        }
        // Check IP subnet (first 3 octets)
        if (!this.isSameSubnet(session.ip_address, currentIp)) {
            return { valid: false, reason: 'IP subnet mismatch' };
        }
        return { valid: true };
    }
    /**
     * Validate device, exact IP, and region
     */
    validateStrict(session, currentIp, currentFingerprint, currentLocation) {
        // Check device
        const deviceCheck = this.validateDevice(session, currentFingerprint);
        if (!deviceCheck.valid) {
            return deviceCheck;
        }
        // Check exact IP
        if (session.ip_address !== currentIp) {
            return { valid: false, reason: 'IP address mismatch' };
        }
        // Check region if available
        if (session.location && currentLocation) {
            if (session.location.country !== currentLocation.country) {
                return { valid: false, reason: 'Geographic region mismatch' };
            }
        }
        return { valid: true };
    }
    /**
     * Check if IPs are in same subnet
     */
    isSameSubnet(ip1, ip2) {
        const parts1 = ip1.split('.');
        const parts2 = ip2.split('.');
        if (parts1.length !== 4 || parts2.length !== 4) {
            // Not IPv4, require exact match
            return ip1 === ip2;
        }
        // Check first 3 octets
        return (parts1[0] === parts2[0] &&
            parts1[1] === parts2[1] &&
            parts1[2] === parts2[2]);
    }
    /**
     * Get binding level
     */
    getBindingLevel() {
        return this.bindingLevel;
    }
    /**
     * Set binding level
     */
    setBindingLevel(level) {
        this.bindingLevel = level;
    }
}
exports.SessionBinding = SessionBinding;
//# sourceMappingURL=session-binding.js.map