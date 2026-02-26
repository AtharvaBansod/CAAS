/**
 * Client Repository
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles all SAAS client data operations with proper indexing and caching
 */

import { MongoDBConnection } from '../storage/mongodb-connection';
import { RedisConnection } from '../storage/redis-connection';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface ClientApiKey {
  key_hash: string;
  key_prefix: string; // First 8 chars of key for identification
  created_at: Date;
  last_used: Date | null;
  revoked: boolean;
}

export interface Client {
  client_id: string;
  tenant_id: string;
  company_name: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'business' | 'enterprise';
  api_keys: {
    primary: ClientApiKey | null;
    secondary: ClientApiKey | null;
  };
  ip_whitelist: string[];
  origin_whitelist: string[];
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  updated_at: Date;
}

export class ClientRepository {
  private readonly COLLECTION = 'clients';
  private readonly CACHE_PREFIX = 'client:';
  private readonly APIKEY_CACHE_PREFIX = 'apikey:';
  private readonly CACHE_TTL = 300; // 5 minutes

  async createClient(data: Partial<Client>): Promise<Client> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const client: Client = {
      client_id: uuidv4(),
      tenant_id: uuidv4(),
      company_name: data.company_name!,
      email: data.email!,
      password_hash: data.password_hash!,
      plan: data.plan || 'free',
      api_keys: {
        primary: null,
        secondary: null,
      },
      ip_whitelist: data.ip_whitelist || [],
      origin_whitelist: data.origin_whitelist || [],
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(this.COLLECTION).insertOne(client);

    // Cache the client
    await redis.setex(
      `${this.CACHE_PREFIX}${client.client_id}`,
      this.CACHE_TTL,
      JSON.stringify(client)
    );

    return client;
  }

  async findById(client_id: string): Promise<Client | null> {
    const redis = RedisConnection.getClient();

    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${client_id}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(`Failed to parse cached client ${client_id}:`, e);
        // Continue to DB if cache is corrupted
      }
    }

    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({ client_id }) as any;

    if (client) {
      await redis.setex(
        `${this.CACHE_PREFIX}${client_id}`,
        this.CACHE_TTL,
        JSON.stringify(client)
      );
    }

    return client;
  }

  async findByEmail(email: string): Promise<Client | null> {
    const db = MongoDBConnection.getDb();
    return await db.collection(this.COLLECTION).findOne({
      email,
      status: { $ne: 'deleted' },
    }) as any;
  }

  async findByTenantId(tenant_id: string): Promise<Client | null> {
    const db = MongoDBConnection.getDb();
    return await db.collection(this.COLLECTION).findOne({
      tenant_id,
      status: 'active',
    }) as any;
  }

  async findByApiKeyHash(keyHash: string): Promise<Client | null> {
    const redis = RedisConnection.getClient();

    // Check cache: apikey:{hash} -> client_id
    const cachedClientId = await redis.get(`${this.APIKEY_CACHE_PREFIX}${keyHash}`);
    if (cachedClientId) {
      return this.findById(cachedClientId);
    }

    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({
      $or: [
        { 'api_keys.primary.key_hash': keyHash, 'api_keys.primary.revoked': false },
        { 'api_keys.secondary.key_hash': keyHash, 'api_keys.secondary.revoked': false },
      ],
      status: 'active',
    }) as any;

    if (client) {
      // Cache the mapping
      await redis.setex(
        `${this.APIKEY_CACHE_PREFIX}${keyHash}`,
        this.CACHE_TTL,
        client.client_id
      );
    }

    return client;
  }

  async updateApiKeys(client_id: string, api_keys: Client['api_keys']): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          api_keys,
          updated_at: new Date(),
        },
      }
    );

    // Invalidate caches
    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    // Invalidate all apikey caches for this client (brute force approach)
    if (api_keys.primary?.key_hash) {
      await redis.del(`${this.APIKEY_CACHE_PREFIX}${api_keys.primary.key_hash}`);
    }
    if (api_keys.secondary?.key_hash) {
      await redis.del(`${this.APIKEY_CACHE_PREFIX}${api_keys.secondary.key_hash}`);
    }
  }

  async updateApiKeyLastUsed(client_id: string, keyType: 'primary' | 'secondary'): Promise<void> {
    const db = MongoDBConnection.getDb();
    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          [`api_keys.${keyType}.last_used`]: new Date(),
        },
      }
    );
  }

  async updateIpWhitelist(client_id: string, ips: string[]): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          ip_whitelist: ips,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updateOriginWhitelist(client_id: string, origins: string[]): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          origin_whitelist: origins,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updatePassword(client_id: string, passwordHash: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          password_hash: passwordHash,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updateStatus(client_id: string, status: Client['status']): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          status,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  static generateApiKey(prefix: string = 'caas'): string {
    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${env}_${randomPart}`;
  }

  async ensureIndexes(): Promise<void> {
    const db = MongoDBConnection.getDb();
    const collection = db.collection(this.COLLECTION);

    await collection.createIndex({ client_id: 1 }, { unique: true });
    await collection.createIndex({ tenant_id: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ 'api_keys.primary.key_hash': 1 });
    await collection.createIndex({ 'api_keys.secondary.key_hash': 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ created_at: -1 });
  }
}
