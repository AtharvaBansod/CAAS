"use strict";
/**
 * JWT Configuration
 * Phase 2 - Authentication - Task AUTH-001
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultJWTConfig = void 0;
exports.getJWTConfig = getJWTConfig;
exports.validateJWTConfig = validateJWTConfig;
exports.defaultJWTConfig = {
    algorithm: process.env.JWT_ALGORITHM || 'RS256',
    accessTokenExpiry: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '900', 10), // 15 minutes
    refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10), // 7 days
    serviceTokenExpiry: parseInt(process.env.JWT_SERVICE_TOKEN_EXPIRY || '3600', 10), // 1 hour
    issuer: process.env.JWT_ISSUER || 'caas.io',
    clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE_SECONDS || '30', 10),
};
function getJWTConfig() {
    return { ...exports.defaultJWTConfig };
}
function validateJWTConfig(config) {
    if (!['RS256', 'ES256'].includes(config.algorithm)) {
        throw new Error(`Invalid JWT algorithm: ${config.algorithm}. Must be RS256 or ES256.`);
    }
    if (config.accessTokenExpiry <= 0) {
        throw new Error('Access token expiry must be positive');
    }
    if (config.refreshTokenExpiry <= 0) {
        throw new Error('Refresh token expiry must be positive');
    }
    if (config.refreshTokenExpiry <= config.accessTokenExpiry) {
        throw new Error('Refresh token expiry must be greater than access token expiry');
    }
    if (config.clockTolerance < 0) {
        throw new Error('Clock tolerance must be non-negative');
    }
    if (!config.issuer || config.issuer.trim() === '') {
        throw new Error('Issuer must be specified');
    }
}
//# sourceMappingURL=jwt-config.js.map