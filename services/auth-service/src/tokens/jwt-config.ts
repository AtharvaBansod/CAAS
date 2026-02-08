/**
 * JWT Configuration
 * Phase 2 - Authentication - Task AUTH-001
 */

import { JWTAlgorithm } from './types';

export interface JWTConfig {
  algorithm: JWTAlgorithm;
  accessTokenExpiry: number;  // in seconds
  refreshTokenExpiry: number; // in seconds
  serviceTokenExpiry: number; // in seconds
  issuer: string;
  clockTolerance: number;     // in seconds
}

export const defaultJWTConfig: JWTConfig = {
  algorithm: (process.env.JWT_ALGORITHM as JWTAlgorithm) || 'RS256',
  accessTokenExpiry: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRY || '900', 10), // 15 minutes
  refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY || '604800', 10), // 7 days
  serviceTokenExpiry: parseInt(process.env.JWT_SERVICE_TOKEN_EXPIRY || '3600', 10), // 1 hour
  issuer: process.env.JWT_ISSUER || 'caas.io',
  clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE_SECONDS || '30', 10),
};

export function getJWTConfig(): JWTConfig {
  return { ...defaultJWTConfig };
}

export function validateJWTConfig(config: JWTConfig): void {
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
