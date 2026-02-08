"use strict";
/**
 * Session Validator
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Validates session state and security
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionValidator = void 0;
const device_fingerprint_1 = require("./device-fingerprint");
class SessionValidator {
    /**
     * Validate session
     */
    async validate(session, options = {}) {
        const { checkExpiry = true, checkActive = true, checkIpAddress = false, checkDeviceFingerprint = false, strictMode = false, } = options;
        // Check if session exists
        if (!session) {
            return {
                valid: false,
                reason: 'Session not found',
            };
        }
        // Check if session is active
        if (checkActive && !session.is_active) {
            return {
                valid: false,
                session,
                reason: 'Session is inactive',
            };
        }
        // Check if session is expired
        if (checkExpiry) {
            const now = Date.now();
            if (now >= session.expires_at) {
                return {
                    valid: false,
                    session,
                    reason: 'Session has expired',
                };
            }
        }
        // All checks passed
        return {
            valid: true,
            session,
        };
    }
    /**
     * Validate IP address match
     */
    validateIpAddress(session, currentIp, strictMode = false) {
        if (strictMode) {
            // Exact match required
            return session.ip_address === currentIp;
        }
        else {
            // Allow same subnet (first 3 octets for IPv4)
            const sessionIpParts = session.ip_address.split('.');
            const currentIpParts = currentIp.split('.');
            if (sessionIpParts.length === 4 && currentIpParts.length === 4) {
                return (sessionIpParts[0] === currentIpParts[0] &&
                    sessionIpParts[1] === currentIpParts[1] &&
                    sessionIpParts[2] === currentIpParts[2]);
            }
            // For IPv6 or other formats, require exact match
            return session.ip_address === currentIp;
        }
    }
    /**
     * Validate device fingerprint
     */
    validateDeviceFingerprint(session, currentFingerprint) {
        const sessionFingerprint = device_fingerprint_1.DeviceFingerprint.fromDeviceInfo(session.device_info);
        return device_fingerprint_1.DeviceFingerprint.match(sessionFingerprint, currentFingerprint);
    }
    /**
     * Check if session needs renewal
     */
    needsRenewal(session, renewalThresholdMs = 3600000) {
        const now = Date.now();
        const timeUntilExpiry = session.expires_at - now;
        return timeUntilExpiry < renewalThresholdMs;
    }
    /**
     * Check if session is idle
     */
    isIdle(session, idleThresholdMs = 1800000) {
        const now = Date.now();
        const timeSinceActivity = now - session.last_activity;
        return timeSinceActivity > idleThresholdMs;
    }
    /**
     * Validate session age
     */
    validateAge(session, maxAgeMs) {
        const now = Date.now();
        const age = now - session.created_at;
        return age <= maxAgeMs;
    }
    /**
     * Get session health score (0-100)
     */
    getHealthScore(session) {
        let score = 100;
        // Deduct points for age
        const ageHours = (Date.now() - session.created_at) / (1000 * 60 * 60);
        if (ageHours > 24)
            score -= 10;
        if (ageHours > 72)
            score -= 20;
        // Deduct points for inactivity
        const inactiveHours = (Date.now() - session.last_activity) / (1000 * 60 * 60);
        if (inactiveHours > 1)
            score -= 10;
        if (inactiveHours > 6)
            score -= 20;
        // Deduct points if not MFA verified
        if (!session.mfa_verified)
            score -= 15;
        // Deduct points if inactive
        if (!session.is_active)
            score -= 50;
        return Math.max(0, score);
    }
}
exports.SessionValidator = SessionValidator;
//# sourceMappingURL=session-validator.js.map