"use strict";
/**
 * Concurrent Session Handler
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Handles concurrent session policies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcurrentSessionHandler = void 0;
const types_1 = require("./types");
class ConcurrentSessionHandler {
    sessionStore;
    policy;
    maxSessions;
    limitAction;
    constructor(sessionStore, policy, maxSessions, limitAction) {
        this.sessionStore = sessionStore;
        this.policy = policy;
        this.maxSessions = maxSessions;
        this.limitAction = limitAction;
    }
    /**
     * Check if new session is allowed
     */
    async canCreateSession(userId, deviceType) {
        const sessions = await this.sessionStore.getUserSessions(userId);
        switch (this.policy) {
            case types_1.ConcurrentSessionPolicy.ALLOW_ALL:
                return { allowed: true };
            case types_1.ConcurrentSessionPolicy.LIMIT:
                return this.checkLimit(sessions);
            case types_1.ConcurrentSessionPolicy.EXCLUSIVE:
                return this.checkExclusive(sessions);
            case types_1.ConcurrentSessionPolicy.DEVICE_EXCLUSIVE:
                return this.checkDeviceExclusive(sessions, deviceType);
            default:
                return { allowed: true };
        }
    }
    /**
     * Check session limit
     */
    checkLimit(sessions) {
        if (sessions.length < this.maxSessions) {
            return { allowed: true };
        }
        switch (this.limitAction) {
            case types_1.SessionLimitAction.REJECT:
                return {
                    allowed: false,
                    reason: `Maximum concurrent sessions (${this.maxSessions}) reached`,
                };
            case types_1.SessionLimitAction.REMOVE_OLDEST:
                const oldest = this.findOldestSession(sessions);
                return {
                    allowed: true,
                    sessionToRemove: oldest?.id,
                };
            case types_1.SessionLimitAction.REMOVE_LEAST_ACTIVE:
                const leastActive = this.findLeastActiveSession(sessions);
                return {
                    allowed: true,
                    sessionToRemove: leastActive?.id,
                };
            default:
                return { allowed: false, reason: 'Session limit reached' };
        }
    }
    /**
     * Check exclusive policy (only one session allowed)
     */
    checkExclusive(sessions) {
        if (sessions.length === 0) {
            return { allowed: true };
        }
        // Remove existing session
        return {
            allowed: true,
            sessionToRemove: sessions[0].id,
        };
    }
    /**
     * Check device exclusive policy (one session per device type)
     */
    checkDeviceExclusive(sessions, deviceType) {
        const existingDeviceSession = sessions.find(s => s.device_info.type === deviceType);
        if (!existingDeviceSession) {
            return { allowed: true };
        }
        // Remove existing session for this device type
        return {
            allowed: true,
            sessionToRemove: existingDeviceSession.id,
        };
    }
    /**
     * Find oldest session
     */
    findOldestSession(sessions) {
        if (sessions.length === 0)
            return undefined;
        return sessions.reduce((oldest, current) => current.created_at < oldest.created_at ? current : oldest);
    }
    /**
     * Find least active session
     */
    findLeastActiveSession(sessions) {
        if (sessions.length === 0)
            return undefined;
        return sessions.reduce((leastActive, current) => current.last_activity < leastActive.last_activity ? current : leastActive);
    }
    /**
     * Get policy configuration
     */
    getPolicy() {
        return {
            policy: this.policy,
            maxSessions: this.maxSessions,
            limitAction: this.limitAction,
        };
    }
    /**
     * Update policy
     */
    updatePolicy(policy, maxSessions, limitAction) {
        if (policy)
            this.policy = policy;
        if (maxSessions)
            this.maxSessions = maxSessions;
        if (limitAction)
            this.limitAction = limitAction;
    }
}
exports.ConcurrentSessionHandler = ConcurrentSessionHandler;
//# sourceMappingURL=concurrent-handler.js.map