/**
 * @deprecated Phase 4.5.z.x: This module is DEPRECATED.
 * Gateway auth operations now use clients/auth-client.ts (AuthServiceClient).
 * The old RSA-based key-provider, jwt-validator, etc. are no longer used.
 * This module is kept for reference only.
 */
// export * from './auth-service-factory';
export * from './tokens';
export * from './refresh';
export * from './revocation';
export * from './sessions';
export * from './mfa';
