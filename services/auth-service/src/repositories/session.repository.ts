/**
 * Session Repository
 * Phase 4.5.0 - Task 05: Centralized Storage & Consistency
 * 
 * Handles session data with MongoDB persistence and Redis caching
 */

import { MongoDBConnection } from '../storage/mongodb-connection';
import { RedisConnection } from '../storage/redis-connection';
import { v4 as uuidv4 } from 'uuid';

export interface Session {
  session_id: string;
  user_id: string;
  tenant_id: string;
  device_fingerprint?: string;
  ip_address: string;
  user_agent: string;
  location?: any;
  is_active: boolean;
  expires_at: Date;
  refresh_token_hash?: string;
  created_at: Date;
  last_activity_at: Date;
  terminated_at?: Date;
}

export class SessionRepository {
  private readonly COLLECTION = 'sessions';
  private readonly CACHE_PREFIX = 'session:';
  private readonly CACHE_TTL = 600; // 10 minutes

  async createSession(data: Partial<Session>): Promise<Session> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const session: Session = {
      session_id: uuidv4(),
      user_id: data.user_id!,
      tenant_id: data.tenant_id!,
      device_fingerprint: data.device_fingerprint,
      ip_address: data.ip_address!,
      user_agent: data.user_agent!,
      location: data.location,
      is_active: true,
      expires_at: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      created_at: new Date(),
      last_activity_at: new Date(),
    };

    await db.collection(this.COLLECTION).insertOne(session);

    // Cache the session
    await redis.setex(
      `${this.CACHE_PREFIX}${session.session_id}`,
      this.CACHE_TTL,
      JSON.stringify(session)
    );

    return session;
  }

  async findById(session_id: string): Promise<Session | null> {
    const redis = RedisConnection.getClient();

    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${session_id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const db = MongoDBConnection.getDb();
    const session = await db.collection(this.COLLECTION).findOne({ session_id }) as any;

    if (session) {
      // Cache the result
      await redis.setex(
        `${this.CACHE_PREFIX}${session_id}`,
        this.CACHE_TTL,
        JSON.stringify(session)
      );
    }

    return session;
  }

  async findByUserId(user_id: string, activeOnly: boolean = true): Promise<Session[]> {
    const db = MongoDBConnection.getDb();
    
    const query: any = { user_id };
    if (activeOnly) {
      query.is_active = true;
      query.expires_at = { $gt: new Date() };
    }

    const sessions = await db
      .collection(this.COLLECTION)
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return sessions as any[];
  }

  async updateActivity(session_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { session_id },
      {
        $set: {
          last_activity_at: new Date(),
        },
      }
    );

    // Invalidate cache
    await redis.del(`${this.CACHE_PREFIX}${session_id}`);
  }

  async terminateSession(session_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { session_id },
      {
        $set: {
          is_active: false,
          terminated_at: new Date(),
        },
      }
    );

    // Remove from cache
    await redis.del(`${this.CACHE_PREFIX}${session_id}`);
  }

  async terminateUserSessions(user_id: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    // Get all session IDs for the user
    const sessions = await this.findByUserId(user_id, true);

    await db.collection(this.COLLECTION).updateMany(
      { user_id, is_active: true },
      {
        $set: {
          is_active: false,
          terminated_at: new Date(),
        },
      }
    );

    // Remove from cache
    for (const session of sessions) {
      await redis.del(`${this.CACHE_PREFIX}${session.session_id}`);
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const db = MongoDBConnection.getDb();

    const result = await db.collection(this.COLLECTION).updateMany(
      {
        is_active: true,
        expires_at: { $lt: new Date() },
      },
      {
        $set: {
          is_active: false,
          terminated_at: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  async getActiveSessionCount(user_id: string): Promise<number> {
    const db = MongoDBConnection.getDb();

    return db.collection(this.COLLECTION).countDocuments({
      user_id,
      is_active: true,
      expires_at: { $gt: new Date() },
    });
  }

  async ensureIndexes(): Promise<void> {
    const db = MongoDBConnection.getDb();
    const collection = db.collection(this.COLLECTION);

    await collection.createIndex({ session_id: 1 }, { unique: true });
    await collection.createIndex({ user_id: 1, is_active: 1 });
    await collection.createIndex({ tenant_id: 1 });
    await collection.createIndex({ expires_at: 1 });
    await collection.createIndex({ created_at: -1 });
    await collection.createIndex({ device_fingerprint: 1 });
  }
}
