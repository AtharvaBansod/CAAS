"use strict";
/**
 * Security Checks for Token Validation
 * Phase 2 - Authentication - Task AUTH-002
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityChecker = exports.defaultSecurityConfig = void 0;
const validation_errors_1 = require("./validation-errors");
exports.defaultSecurityConfig = {
    allowedAlgorithms: ['RS256', 'ES256'],
    maxTokenSize: parseInt(process.env.TOKEN_MAX_SIZE_BYTES || '8192', 10), // 8KB
    rejectNoneAlgorithm: true,
};
class SecurityChecker {
    config;
    constructor(config = exports.defaultSecurityConfig) {
        this.config = config;
    }
    /**
     * Check token size
     */
    checkTokenSize(token) {
        const tokenSize = Buffer.byteLength(token, 'utf8');
        if (tokenSize > this.config.maxTokenSize) {
            throw new validation_errors_1.TokenSizeError(`Token size (${tokenSize} bytes) exceeds maximum allowed (${this.config.maxTokenSize} bytes)`);
        }
    }
    /**
     * Check token structure (must have 3 parts)
     */
    checkTokenStructure(token) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new validation_errors_1.TokenMalformedError(`Token must have 3 parts (header.payload.signature), found ${parts.length}`);
        }
        // Check each part is not empty
        if (parts.some(part => !part || part.trim() === '')) {
            throw new validation_errors_1.TokenMalformedError('Token parts cannot be empty');
        }
    }
    /**
     * Check algorithm is allowed
     */
    checkAlgorithm(algorithm) {
        // Reject 'none' algorithm (critical security check)
        if (this.config.rejectNoneAlgorithm && algorithm.toLowerCase() === 'none') {
            throw new validation_errors_1.TokenAlgorithmError('Algorithm "none" is not allowed');
        }
        // Check if algorithm is in allowed list
        if (!this.config.allowedAlgorithms.includes(algorithm)) {
            throw new validation_errors_1.TokenAlgorithmError(`Algorithm "${algorithm}" is not allowed. Allowed: ${this.config.allowedAlgorithms.join(', ')}`);
        }
    }
    /**
     * Decode and validate header
     */
    decodeAndValidateHeader(token) {
        try {
            const headerPart = token.split('.')[0];
            const headerJson = Buffer.from(headerPart, 'base64').toString('utf8');
            const header = JSON.parse(headerJson);
            if (!header.alg) {
                throw new validation_errors_1.TokenMalformedError('Token header missing "alg" field');
            }
            return header;
        }
        catch (error) {
            if (error instanceof validation_errors_1.TokenMalformedError) {
                throw error;
            }
            throw new validation_errors_1.TokenMalformedError('Failed to decode token header');
        }
    }
    /**
     * Perform all security checks
     */
    performSecurityChecks(token) {
        // Check token size
        this.checkTokenSize(token);
        // Check token structure
        this.checkTokenStructure(token);
        // Decode and validate header
        const header = this.decodeAndValidateHeader(token);
        // Check algorithm
        this.checkAlgorithm(header.alg);
        return header;
    }
    /**
     * Validate token format (basic check without cryptographic verification)
     */
    static isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        // Check each part is valid base64url
        const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
        return parts.every(part => base64UrlRegex.test(part));
    }
}
exports.SecurityChecker = SecurityChecker;
//# sourceMappingURL=security-checks.js.map