/**
 * Auth Service - Main Entry Point
 * Phase 2 - Authentication - Complete Implementation
 * 
 * This service provides comprehensive authentication functionality including:
 * - JWT token generation and validation
 * - Token refresh with rotation and reuse detection
 * - Token revocation (individual, user-wide, session-wide)
 * - Session management with security features
 * - Multi-factor authentication (TOTP, backup codes, trusted devices)
 * - MFA challenge flow
 */

export * from './tokens';
export * from './refresh';
export * from './revocation';
export * from './sessions';
export * from './mfa';
