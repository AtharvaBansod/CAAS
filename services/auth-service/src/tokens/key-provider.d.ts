/**
 * Key Provider
 * Phase 2 - Authentication - Task AUTH-001
 *
 * Manages signing keys for JWT tokens with support for:
 * - Key rotation (multiple active keys)
 * - Tenant-specific keys (optional)
 * - Fallback to platform keys
 */
import { SigningKey, JWTAlgorithm } from './types';
export interface KeyProviderConfig {
    keysDirectory: string;
    platformKeyId: string;
    enableTenantKeys: boolean;
}
export declare class KeyProvider {
    private platformKeys;
    private tenantKeys;
    private config;
    constructor(config: KeyProviderConfig);
    /**
     * Load platform signing keys from secure storage
     */
    private loadPlatformKeys;
    /**
     * Get signing key for token generation
     * Priority: Tenant-specific key > Platform key
     */
    getSigningKey(tenantId?: string): SigningKey;
    /**
     * Get public key for token verification by key ID
     */
    getPublicKey(kid: string, tenantId?: string): string | null;
    /**
     * Get all active public keys (for JWKS endpoint)
     */
    getAllPublicKeys(): Array<{
        kid: string;
        algorithm: JWTAlgorithm;
        publicKey: string;
    }>;
    /**
     * Add a new signing key (for key rotation)
     */
    addSigningKey(key: SigningKey, tenantId?: string): void;
    /**
     * Deactivate a signing key (for key rotation)
     */
    deactivateKey(kid: string, tenantId?: string): void;
    /**
     * Check if a key exists and is active
     */
    isKeyActive(kid: string, tenantId?: string): boolean;
    /**
     * Get key rotation status
     */
    getKeyRotationStatus(): {
        platformKeys: number;
        tenantKeys: number;
        activeKeys: number;
    };
}
/**
 * Create default key provider instance
 */
export declare function createKeyProvider(): KeyProvider;
