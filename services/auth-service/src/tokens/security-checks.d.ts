/**
 * Security Checks for Token Validation
 * Phase 2 - Authentication - Task AUTH-002
 */
import { JWTAlgorithm } from './types';
export interface SecurityConfig {
    allowedAlgorithms: JWTAlgorithm[];
    maxTokenSize: number;
    rejectNoneAlgorithm: boolean;
}
export declare const defaultSecurityConfig: SecurityConfig;
export declare class SecurityChecker {
    private config;
    constructor(config?: SecurityConfig);
    /**
     * Check token size
     */
    checkTokenSize(token: string): void;
    /**
     * Check token structure (must have 3 parts)
     */
    checkTokenStructure(token: string): void;
    /**
     * Check algorithm is allowed
     */
    checkAlgorithm(algorithm: string): void;
    /**
     * Decode and validate header
     */
    decodeAndValidateHeader(token: string): {
        alg: string;
        kid?: string;
    };
    /**
     * Perform all security checks
     */
    performSecurityChecks(token: string): {
        alg: string;
        kid?: string;
    };
    /**
     * Validate token format (basic check without cryptographic verification)
     */
    static isValidTokenFormat(token: string): boolean;
}
