import crypto from 'crypto';
import { Collection } from 'mongodb';
import { mongoConnection } from '../storage/mongodb-connection';
import { redisConnection } from '../storage/redis-connection';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';

export interface EncryptionKey {
  key_id: string;
  tenant_id: string;
  key_type: 'master' | 'data' | 'session';
  key_data: string; // Base64 encoded
  created_at: Date;
  expires_at: Date;
  is_active: boolean;
}

export class EncryptionService {
  private keyCollection: Collection<EncryptionKey>;

  constructor() {
    this.keyCollection = mongoConnection.getDb().collection('encryption_keys');
  }

  /**
   * Generate a new encryption key
   */
  public async generateKey(tenant_id: string, key_type: EncryptionKey['key_type']): Promise<string> {
    const key_id = uuidv4();
    const keyBuffer = crypto.randomBytes(config.encryption.keyLength);
    const key_data = keyBuffer.toString('base64');

    const created_at = new Date();
    const expires_at = new Date(created_at.getTime() + config.keyManagement.keyExpiry);

    const key: EncryptionKey = {
      key_id,
      tenant_id,
      key_type,
      key_data,
      created_at,
      expires_at,
      is_active: true,
    };

    await this.keyCollection.insertOne(key);

    // Cache key for quick access
    const redis = redisConnection.getClient();
    await redis.setex(`key:${key_id}`, 3600, key_data);

    return key_id;
  }

  /**
   * Get encryption key
   */
  private async getKey(key_id: string): Promise<Buffer> {
    // Try cache first
    const redis = redisConnection.getClient();
    const cachedKey = await redis.get(`key:${key_id}`);

    if (cachedKey) {
      return Buffer.from(cachedKey, 'base64');
    }

    // Get from database
    const key = await this.keyCollection.findOne({ key_id, is_active: true });
    if (!key) {
      throw new Error('Key not found or inactive');
    }

    // Check expiry
    if (key.expires_at < new Date()) {
      throw new Error('Key expired');
    }

    // Cache for future use
    await redis.setex(`key:${key_id}`, 3600, key.key_data);

    return Buffer.from(key.key_data, 'base64');
  }

  /**
   * Encrypt data
   */
  public async encrypt(key_id: string, plaintext: string): Promise<{
    ciphertext: string;
    iv: string;
    authTag: string;
  }> {
    const key = await this.getKey(key_id);
    const iv = crypto.randomBytes(config.encryption.ivLength);

    const cipher = crypto.createCipheriv(config.encryption.algorithm, key, iv) as crypto.CipherGCM;
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt data
   */
  public async decrypt(key_id: string, ciphertext: string, iv: string, authTag: string): Promise<string> {
    const key = await this.getKey(key_id);
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');

    const decipher = crypto.createDecipheriv(config.encryption.algorithm, key, ivBuffer) as crypto.DecipherGCM;
    decipher.setAuthTag(authTagBuffer);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Rotate key (create new key and mark old as inactive)
   */
  public async rotateKey(old_key_id: string, tenant_id: string): Promise<string> {
    // Get old key to determine type
    const oldKey = await this.keyCollection.findOne({ key_id: old_key_id });
    if (!oldKey) {
      throw new Error('Old key not found');
    }

    // Generate new key
    const new_key_id = await this.generateKey(tenant_id, oldKey.key_type);

    // Mark old key as inactive
    await this.keyCollection.updateOne(
      { key_id: old_key_id },
      { $set: { is_active: false } }
    );

    // Remove from cache
    const redis = redisConnection.getClient();
    await redis.del(`key:${old_key_id}`);

    return new_key_id;
  }

  /**
   * Get active keys for tenant
   */
  public async getTenantKeys(tenant_id: string): Promise<EncryptionKey[]> {
    return await this.keyCollection
      .find({ tenant_id, is_active: true })
      .sort({ created_at: -1 })
      .toArray();
  }
}
