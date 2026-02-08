"use strict";
/**
 * Refresh Token Types
 * Phase 2 - Authentication - Task AUTH-003
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRotationPolicy = void 0;
exports.defaultRotationPolicy = {
    enabled: process.env.REFRESH_TOKEN_ROTATION !== 'false',
    reuseDetection: process.env.REFRESH_TOKEN_REUSE_DETECTION !== 'false',
    revokeFamily: true,
};
//# sourceMappingURL=types.js.map