/**
 * User Repository
 * Phase 4.5.0 - Task 05: Centralized Storage & Consistency
 * 
 * Handles all user data operations with proper indexing and caching
 */

import { MongoDBConnection } from '../storage/mongodb-connection';
import { RedisConnection } from '../storage/redis-connection';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  username?: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  mfa_backup_codes?: string[];
  profile_data?: any;
  preferences?: any;
  status: 'active' | 'suspended' | 'deleted';
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  private readonly COLLECTION = 'users';
  private readonly CACHE_PREFIX = 'user:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  async createUser(data: Partial<User>): Promise<User> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const user: User = {
      user_id: uuidv4(),
      tenant_id: data.tenant_id!,
      email: data.email!,
      username: data.username,
      password_hash: data.password_hash!,
      mfa_enabled: false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(this.COLLECTION).insertOne(user);

    // Cache the user
    await redis.setex(
      `${this.CACHE_PREFIX}${user.user_id}`,
      this.CACHE_TTL,
      JSON.stringify(user)
    );

    return user;
  }

  async findById(user_id: string): Promise<User | null> {
    const redis = RedisConnection.getClient();

    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${user_id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const db = MongoDBConnection.getDb();
    const user = await db.collection(this.COLLECTION).findOne({ user_id }) as any;

    if (user) {
      // Cache the result
      await redis.setex(
        `${this.CACHE_PREFIX}${user_id}`,
        this.CACHE_TTL,
        JSON.stringify(user)
      );
    }

    return user;
  }

  async findByEmail(email: string, tenant_id: string): Promise<User | null> {
    const db = MongoDBConnection.getDb();
    const user = await db.collection(this.COLLECTION).findOne({
      email,
      tenant_id,
      status: 'active',
    }) as any;

    return user;
  }

  async updateUser(user_id: string, updates: Partial<User>): Promise<User | null> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const result = await db.collection(this.COLLECTION).findOneAndUpdate(
      { user_id },
      {
        $set: {
          ...updates,
          updated_at: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (result) {
      // Invalidate cache
      await redis.del(`${this.CACHE_PREFIX}${user_id}`);
    }

    return result as any;
  }

  async updateLastLogin(user_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { user_id },
      {
        $set: {
          last_login_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${user_id}`);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async enableMFA(user_id: string, secret: string, backupCodes: string[]): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { user_id },
      {
        $set: {
          mfa_enabled: true,
          mfa_secret: secret,
          mfa_backup_codes: backupCodes,
          updated_at: new Date(),
        },
      }
    );

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${user_id}`);
  }

  async disableMFA(user_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { user_id },
      {
        $set: {
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          updated_at: new Date(),
        },
      }
    );

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${user_id}`);
  }

  async deleteUser(user_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { user_id },
      {
        $set: {
          status: 'deleted',
          updated_at: new Date(),
        },
      }
    );

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${user_id}`);
  }

  async ensureIndexes(): Promise<void> {
    const db = MongoDBConnection.getDb();
    const collection = db.collection(this.COLLECTION);

    await collection.createIndex({ user_id: 1 }, { unique: true });
    await collection.createIndex({ email: 1, tenant_id: 1 }, { unique: true });
    await collection.createIndex({ tenant_id: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ created_at: -1 });
  }
}
