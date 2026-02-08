/**
 * JWT Configuration
 * Phase 2 - Authentication - Task AUTH-001
 */
import { JWTAlgorithm } from './types';
export interface JWTConfig {
    algorithm: JWTAlgorithm;
    accessTokenExpiry: number;
    refreshTokenExpiry: number;
    serviceTokenExpiry: number;
    issuer: string;
    clockTolerance: number;
}
export declare const defaultJWTConfig: JWTConfig;
export declare function getJWTConfig(): JWTConfig;
export declare function validateJWTConfig(config: JWTConfig): void;
