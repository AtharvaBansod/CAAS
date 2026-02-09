/**
 * Key Provider
 * Phase 2 - Authentication - Task AUTH-001
 * 
 * Manages signing keys for JWT tokens with support for:
 * - Key rotation (multiple active keys)
 * - Tenant-specific keys (optional)
 * - Fallback to platform keys
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { SigningKey, JWTAlgorithm } from './types';

export interface KeyProviderConfig {
  keysDirectory: string;
  platformKeyId: string;
  enableTenantKeys: boolean;
}

export class KeyProvider {
  private platformKeys: Map<string, SigningKey> = new Map();
  private tenantKeys: Map<string, Map<string, SigningKey>> = new Map();
  private config: KeyProviderConfig;

  constructor(config: KeyProviderConfig) {
    this.config = config;
    this.loadPlatformKeys();
  }

  /**
   * Load platform signing keys from secure storage
   */
  private loadPlatformKeys(): void {
    try {
      const publicKey = process.env.JWT_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('JWT_PUBLIC_KEY environment variable is not set.');
      }

      const platformKey: SigningKey = {
        kid: this.config.platformKeyId,
        algorithm: 'RS256', // Assuming RS256 for platform key
        privateKey: '', // Not needed for verification
        publicKey,
        createdAt: new Date(),
        isActive: true,
      };

      this.platformKeys.set(platformKey.kid, platformKey);
    } catch (error) {
      throw new Error(`Failed to load platform keys: ${error}`);
    }
  }

  /**
   * Get signing key for token generation
   * Priority: Tenant-specific key > Platform key
   */
  getSigningKey(tenantId?: string): SigningKey {
    // Try tenant-specific key if enabled and tenant provided
    if (this.config.enableTenantKeys && tenantId) {
      const tenantKeyMap = this.tenantKeys.get(tenantId);
      if (tenantKeyMap && tenantKeyMap.size > 0) {
        // Get the most recent active key
        const activeKeys = Array.from(tenantKeyMap.values())
          .filter(key => key.isActive)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        if (activeKeys.length > 0) {
          return activeKeys[0];
        }
      }
    }

    // Fallback to platform key
    const platformKey = this.platformKeys.get(this.config.platformKeyId);
    if (!platformKey) {
      throw new Error('No platform signing key available');
    }

    return platformKey;
  }

  /**
   * Get public key for token verification by key ID
   */
  getPublicKey(kid: string, tenantId?: string): string | null {
    // Check tenant keys first
    if (tenantId) {
      const tenantKeyMap = this.tenantKeys.get(tenantId);
      const tenantKey = tenantKeyMap?.get(kid);
      if (tenantKey) {
        return tenantKey.publicKey;
      }
    }

    // Check platform keys
    const platformKey = this.platformKeys.get(kid);
    return platformKey?.publicKey || null;
  }

  /**
   * Get all active public keys (for JWKS endpoint)
   */
  getAllPublicKeys(): Array<{ kid: string; algorithm: JWTAlgorithm; publicKey: string }> {
    const keys: Array<{ kid: string; algorithm: JWTAlgorithm; publicKey: string }> = [];

    // Add platform keys
    this.platformKeys.forEach(key => {
      if (key.isActive) {
        keys.push({
          kid: key.kid,
          algorithm: key.algorithm,
          publicKey: key.publicKey,
        });
      }
    });

    return keys;
  }

  /**
   * Add a new signing key (for key rotation)
   */
  addSigningKey(key: SigningKey, tenantId?: string): void {
    if (tenantId) {
      if (!this.tenantKeys.has(tenantId)) {
        this.tenantKeys.set(tenantId, new Map());
      }
      this.tenantKeys.get(tenantId)!.set(key.kid, key);
    } else {
      this.platformKeys.set(key.kid, key);
    }
  }

  /**
   * Deactivate a signing key (for key rotation)
   */
  deactivateKey(kid: string, tenantId?: string): void {
    if (tenantId) {
      const tenantKeyMap = this.tenantKeys.get(tenantId);
      const key = tenantKeyMap?.get(kid);
      if (key) {
        key.isActive = false;
      }
    } else {
      const key = this.platformKeys.get(kid);
      if (key) {
        key.isActive = false;
      }
    }
  }

  /**
   * Check if a key exists and is active
   */
  isKeyActive(kid: string, tenantId?: string): boolean {
    if (tenantId) {
      const tenantKeyMap = this.tenantKeys.get(tenantId);
      const key = tenantKeyMap?.get(kid);
      return key?.isActive || false;
    }

    const key = this.platformKeys.get(kid);
    return key?.isActive || false;
  }

  /**
   * Get key rotation status
   */
  getKeyRotationStatus(): {
    platformKeys: number;
    tenantKeys: number;
    activeKeys: number;
  } {
    const platformKeysCount = this.platformKeys.size;
    const tenantKeysCount = Array.from(this.tenantKeys.values())
      .reduce((sum, map) => sum + map.size, 0);
    
    const activeKeysCount = 
      Array.from(this.platformKeys.values()).filter(k => k.isActive).length +
      Array.from(this.tenantKeys.values())
        .flatMap(map => Array.from(map.values()))
        .filter(k => k.isActive).length;

    return {
      platformKeys: platformKeysCount,
      tenantKeys: tenantKeysCount,
      activeKeys: activeKeysCount,
    };
  }
}

/**
 * Create default key provider instance
 */
export function createKeyProvider(): KeyProvider {
  const config: KeyProviderConfig = {
    keysDirectory: process.env.JWT_KEYS_DIRECTORY || join(__dirname, '../../keys'),
    platformKeyId: process.env.JWT_PLATFORM_KEY_ID || 'platform-key-1',
    enableTenantKeys: process.env.JWT_ENABLE_TENANT_KEYS === 'true',
  };

  return new KeyProvider(config);
}
