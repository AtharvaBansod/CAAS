"use strict";
/**
 * Session Types
 * Phase 2 - Authentication - Task AUTH-005
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSessionConfig = void 0;
exports.defaultSessionConfig = {
    ttl_seconds: parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10), // 24 hours
    max_sessions_per_user: parseInt(process.env.MAX_SESSIONS_PER_USER || '10', 10),
    renewal_cooldown_ms: parseInt(process.env.SESSION_RENEWAL_COOLDOWN_MS || '60000', 10), // 1 minute
    max_lifetime_seconds: parseInt(process.env.SESSION_MAX_LIFETIME_SECONDS || '604800', 10), // 7 days
    cleanup_interval_ms: parseInt(process.env.SESSION_CLEANUP_INTERVAL_MS || '300000', 10), // 5 minutes
};
//# sourceMappingURL=types.js.map
