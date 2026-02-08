/**
 * Master Key Provider
 * Manages master key hierarchy: Root -> Tenant -> User
 */

import { keyDerivation } from '../keys/key-derivation';
import { MasterKeyInfo } from './types';

export class MasterKeyProvider {
  private rootKey: Buffer | null = null;
  private keyCache: Map<string, Buffer> = new Map();
  private readonly ROOT_KEY_ENV = 'MASTER_KEY';

  /**
   * Initialize with root key from environment or HSM
   */
  async initialize(): Promise<void> {
    const rootKeyHex = process.env[this.ROOT_KEY_ENV];
    
    if (!rootKeyHex) {
      throw new Error('Master key not configured. Set MASTER_KEY environment variable.');
    }

    this.rootKey = Buffer.from(rootKeyHex, 'hex');

    if (this.rootKey.length !== 32) {
      throw new Error('Master key must be 32 bytes (256 bits)');
    }
  }

  /**
   * Get root key
   */
  async getRootKey(): Promise<Buffer> {
    if (!this.rootKey) {
      await this.initialize();
    }

    if (!this.rootKey) {
      throw new Error('Root key not initialized');
    }

    return this.rootKey;
  }

  /**
   * Derive tenant encryption key from root key
   */
  async getTenantKey(tenantId: string): Promise<Buffer> {
    const cacheKey = `tenant:${tenantId}`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const rootKey = await this.getRootKey();
    const tenantKey = await keyDerivation.deriveTenantKey(rootKey, tenantId);
    
    this.keyCache.set(cacheKey, tenantKey);
    return tenantKey;
  }

  /**
   * Derive user encryption key from tenant key
   */
  async getUserKey(tenantId: string, userId: string): Promise<Buffer> {
    const cacheKey = `user:${tenantId}:${userId}`;
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const tenantKey = await this.getTenantKey(tenantId);
    const userKey = await keyDerivation.deriveUserKey(tenantKey, userId);
    
    this.keyCache.set(cacheKey, userKey);
    return userKey;
  }

  /**
   * Get encryption key for storing user keys
   */
  async getEncryptionKey(tenantId: string, userId: string): Promise<Buffer> {
    return this.getUserKey(tenantId, userId);
  }

  /**
   * Rotate root key (for master key rotation)
   */
  async rotateRootKey(newRootKey: Buffer): Promise<void> {
    if (newRootKey.length !== 32) {
      throw new Error('New root key must be 32 bytes');
    }

    this.rootKey = newRootKey;
    this.clearCache();
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    this.keyCache.clear();
  }

  /**
   * Clear specific tenant from cache
   */
  clearTenantCache(tenantId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.keyCache.keys()) {
      if (key.includes(tenantId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.keyCache.delete(key));
  }

  /**
   * Get master key info
   */
  async getMasterKeyInfo(): Promise<MasterKeyInfo> {
    return {
      key_id: 'root_key_v1',
      version: 1,
      created_at: new Date(),
      is_active: true,
    };
  }

  /**
   * Generate new root key
   */
  static generateRootKey(): Buffer {
    const crypto = require('crypto');
    return crypto.randomBytes(32);
  }

  /**
   * Validate root key format
   */
  static validateRootKey(key: Buffer): boolean {
    return key.length === 32;
  }
}

export const masterKeyProvider = new MasterKeyProvider();
