"use strict";
/**
 * Session Termination
 * Phase 2 - Authentication - Task AUTH-006
 *
 * Handles session termination with cleanup and event emission
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionTermination = void 0;
const types_1 = require("../revocation/types");
class SessionTermination {
    sessionStore;
    revocationService;
    constructor(sessionStore, revocationService) {
        this.sessionStore = sessionStore;
        this.revocationService = revocationService;
    }
    /**
     * Terminate single session
     */
    async terminateSession(sessionId, reason = types_1.RevocationReason.LOGOUT) {
        // Get session
        const session = await this.sessionStore.get(sessionId);
        if (!session) {
            return {
                success: false,
                message: 'Session not found',
            };
        }
        // Revoke session tokens
        await this.revocationService.revokeSessionTokens(sessionId, session.user_id, 7 * 24 * 60 * 60, // 7 days TTL
        reason);
        // Delete session
        await this.sessionStore.delete(sessionId);
        return {
            success: true,
            message: 'Session terminated successfully',
        };
    }
    /**
     * Terminate all user sessions
     */
    async terminateAllSessions(userId, reason = types_1.RevocationReason.LOGOUT) {
        // Get all user sessions
        const sessions = await this.sessionStore.getUserSessions(userId);
        // Terminate each session
        for (const session of sessions) {
            await this.terminateSession(session.id, reason);
        }
        return {
            success: true,
            count: sessions.length,
        };
    }
    /**
     * Terminate all sessions except current
     */
    async terminateOtherSessions(userId, currentSessionId, reason = types_1.RevocationReason.LOGOUT) {
        // Get all user sessions
        const sessions = await this.sessionStore.getUserSessions(userId);
        // Terminate all except current
        let count = 0;
        for (const session of sessions) {
            if (session.id !== currentSessionId) {
                await this.terminateSession(session.id, reason);
                count++;
            }
        }
        return {
            success: true,
            count,
        };
    }
    /**
     * Terminate sessions by device
     */
    async terminateDeviceSessions(userId, deviceId, reason = types_1.RevocationReason.DEVICE_REMOVED) {
        // Get all user sessions
        const sessions = await this.sessionStore.getUserSessions(userId);
        // Terminate sessions for specific device
        let count = 0;
        for (const session of sessions) {
            if (session.device_id === deviceId) {
                await this.terminateSession(session.id, reason);
                count++;
            }
        }
        return {
            success: true,
            count,
        };
    }
    /**
     * Terminate idle sessions
     */
    async terminateIdleSessions(userId, idleThresholdMs = 30 * 60 * 1000 // 30 minutes
    ) {
        // Get all user sessions
        const sessions = await this.sessionStore.getUserSessions(userId);
        const now = Date.now();
        // Terminate idle sessions
        let count = 0;
        for (const session of sessions) {
            const timeSinceActivity = now - session.last_activity;
            if (timeSinceActivity > idleThresholdMs) {
                await this.terminateSession(session.id, types_1.RevocationReason.SESSION_EXPIRED);
                count++;
            }
        }
        return {
            success: true,
            count,
        };
    }
    /**
     * Terminate expired sessions
     */
    async terminateExpiredSessions(userId) {
        // Get all user sessions
        const sessions = await this.sessionStore.getUserSessions(userId);
        const now = Date.now();
        // Terminate expired sessions
        let count = 0;
        for (const session of sessions) {
            if (now >= session.expires_at) {
                await this.terminateSession(session.id, types_1.RevocationReason.SESSION_EXPIRED);
                count++;
            }
        }
        return {
            success: true,
            count,
        };
    }
}
exports.SessionTermination = SessionTermination;
//# sourceMappingURL=session-termination.js.map
