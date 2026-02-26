"use strict";
/**
 * Session Service
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Main service for session lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const crypto_1 = require("crypto");
const session_validator_1 = require("./session-validator");
const session_renewal_1 = require("./session-renewal");
class SessionService {
    sessionStore;
    config;
    validator;
    renewal;
    termination;
    constructor(sessionStore, config, renewalPolicy, termination) {
        this.sessionStore = sessionStore;
        this.config = config;
        this.validator = new session_validator_1.SessionValidator();
        this.renewal = new session_renewal_1.SessionRenewal(sessionStore, renewalPolicy);
        this.termination = termination;
    }
    /**
     * Create new session
     */
    async createSession(params) {
        // Check session limit
        const currentCount = await this.sessionStore.getUserSessionCount(params.user_id);
        if (currentCount >= this.config.max_sessions_per_user) {
            // Remove oldest session
            await this.removeOldestSession(params.user_id);
        }
        // Generate device ID if not provided
        const deviceId = params.device_id || (0, crypto_1.randomUUID)();
        // Create session
        const session = await this.sessionStore.create({
            user_id: params.user_id,
            tenant_id: params.tenant_id,
            device_id: deviceId,
            device_info: params.device_info,
            ip_address: params.ip_address,
            location: params.location,
        });
        console.log('Session created:', {
            session_id: session.id,
            user_id: session.user_id,
            device_type: session.device_info.type,
            ip: this.maskIp(session.ip_address),
        });
        return session;
    }
    /**
     * Validate session
     */
    async validateSession(sessionId, options) {
        const session = await this.sessionStore.get(sessionId);
        if (!session) {
            return {
                valid: false,
                reason: 'Session not found',
            };
        }
        // Validate session
        const validation = await this.validator.validate(session, options);
        // Update last activity if valid
        if (validation.valid) {
            await this.sessionStore.updateLastActivity(sessionId);
        }
        return validation;
    }
    /**
     * Renew session
     */
    async renewSession(sessionId) {
        const result = await this.renewal.renew(sessionId);
        if (!result.renewed) {
            throw new Error(`Session renewal failed: ${result.reason}`);
        }
        return result.session;
    }
    /**
     * Terminate session
     */
    async terminateSession(sessionId) {
        await this.termination.terminateSession(sessionId);
    }
    /**
     * Terminate all user sessions
     */
    async terminateAllSessions(userId, exceptSessionId) {
        if (exceptSessionId) {
            const result = await this.termination.terminateOtherSessions(userId, exceptSessionId);
            return result.count;
        }
        else {
            const result = await this.termination.terminateAllSessions(userId);
            return result.count;
        }
    }
    /**
     * Get user sessions
     */
    async getUserSessions(userId) {
        return await this.sessionStore.getUserSessions(userId);
    }
    /**
     * Get session
     */
    async getSession(sessionId) {
        return await this.sessionStore.get(sessionId);
    }
    /**
     * Update session MFA status
     */
    async markMfaVerified(sessionId) {
        const session = await this.sessionStore.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }
        await this.sessionStore.update(sessionId, { mfa_verified: true });
    }
    /**
     * Get session health score
     */
    async getSessionHealth(sessionId) {
        const session = await this.sessionStore.get(sessionId);
        if (!session) {
            return 0;
        }
        return this.validator.getHealthScore(session);
    }
    // Private helper methods
    async removeOldestSession(userId) {
        const sessions = await this.sessionStore.getUserSessions(userId);
        if (sessions.length === 0) {
            return;
        }
        // Find oldest session
        const oldest = sessions.reduce((prev, current) => prev.created_at < current.created_at ? prev : current);
        await this.sessionStore.delete(oldest.id);
    }
    maskIp(ip) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
        return 'xxx.xxx.xxx.xxx';
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=session-service.js.map
