# Centralized Storage Architecture
## Phase 4.5.4 - Storage and Consistency Patterns

**Date**: February 21, 2026  
**Status**: ✅ Implemented  
**Version**: 1.0

---

## Overview

The CAAS platform uses a centralized storage architecture with MongoDB as the primary database, Redis for caching, and Kafka for event streaming. This document describes the storage patterns, consistency models, and data management strategies implemented across all services.

---

## Storage Components

### 1. Primary Storage - MongoDB

**Configuration:**
- **Deployment**: 3-node replica set (1 primary, 2 secondaries)
- **Version**: MongoDB 7.0
- **Replication**: Automatic failover with majority write concern
- **Authentication**: SCRAM-SHA-256
- **Network**: Internal Docker network (caas-network)

**Databases:**
```
- caas_platform     (Platform-level data)
- caas_auth         (Authentication service)
- caas_compliance   (Compliance service)
- caas_crypto       (Crypto service)
- caas_messaging    (Messaging service)
- caas_media        (Media service)
- caas_search       (Search service)
```

**Replica Set Configuration:**
```javascript
{
  _id: 'caas-rs',
  members: [
    { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
    { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 },
    { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 }
  ]
}
```

### 2. Cache Layer - Redis

**Configuration:**
- **Version**: Redis 7 Alpine
- **Deployment**: Single instance (can be clustered)
- **Persistence**: RDB + AOF for durability
- **Network**: Internal Docker network

**Database Allocation:**
```
DB 0: Platform cache
DB 1: Auth service cache
DB 2: Compliance service cache
DB 3: Crypto service cache
DB 4: Session storage
DB 5: Rate limiting
```

**Cache Strategies:**
- **TTL-based expiration**: All cached items have TTL
- **Cache-aside pattern**: Application manages cache
- **Write-through**: Critical data written to both DB and cache
- **Lazy loading**: Cache populated on first read

### 3. Event Streaming - Kafka

**Configuration:**
- **Version**: Confluent Platform 7.5.0
- **Deployment**: 3-node cluster
- **Replication Factor**: 3
- **Partitions**: 3 per topic

**Topics:**
```
- platform.events
- platform.audit
- platform.notifications
- auth.revocation.events
- chat.messages
- chat.events
- notifications
```

---

## Consistency Models

### 1. Strong Consistency

**Used For:**
- User authentication
- Session management
- Authorization decisions
- Cryptographic key operations

**Implementation:**
- MongoDB replica set with majority write concern
- Synchronous writes to primary
- Read from primary for critical operations
- Repository pattern with immediate consistency

**Example:**
```typescript
// User authentication - strong consistency required
const user = await userRepository.findByEmail(email, tenant_id);
if (user && await userRepository.verifyPassword(password, user.password_hash)) {
  await userRepository.updateLastLogin(user.user_id); // Immediate consistency
  return user;
}
```

### 2. Eventual Consistency

**Used For:**
- Audit logs
- Analytics data
- Non-critical notifications
- Search indexing

**Implementation:**
- Asynchronous writes to MongoDB
- Kafka event streaming
- Background processing
- Retry mechanisms for failures

**Example:**
```typescript
// Audit logging - eventual consistency acceptable
await complianceClient.logAuditEvent({
  action: 'user_login',
  user_id: user.user_id,
  // Batched and processed asynchronously
});
```

### 3. Causal Consistency

**Used For:**
- Messaging conversations
- Real-time updates
- User presence

**Implementation:**
- MongoDB causal consistency sessions
- Ordered event processing
- Timestamp-based ordering

### 4. Read-Your-Writes Consistency

**Used For:**
- User profile updates
- Preferences
- Settings

**Implementation:**
- Cache invalidation on write
- Read from cache after write
- Repository pattern ensures consistency

---

## Repository Pattern

### Implementation

All services use the repository pattern for data access:

**Benefits:**
- Centralized data access logic
- Consistent caching strategy
- Easy to test with mocks
- Separation of concerns

**Example - User Repository:**
```typescript
export class UserRepository {
  private readonly COLLECTION = 'users';
  private readonly CACHE_PREFIX = 'user:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  async findById(user_id: string): Promise<User | null> {
    const redis = RedisConnection.getClient();
    
    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${user_id}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const db = MongoDBConnection.getDb();
    const user = await db.collection(this.COLLECTION).findOne({ user_id });

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

  async updateUser(user_id: string, updates: Partial<User>): Promise<User | null> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const result = await db.collection(this.COLLECTION).findOneAndUpdate(
      { user_id },
      { $set: { ...updates, updated_at: new Date() } },
      { returnDocument: 'after' }
    );

    if (result) {
      // Invalidate cache
      await redis.del(`${this.CACHE_PREFIX}${user_id}`);
    }

    return result;
  }
}
```

---

## Caching Strategy

### Cache Hierarchy

```
┌─────────────────────────────────────┐
│     Application Layer               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     In-Memory Cache (Optional)      │
│     - Hot data                      │
│     - LRU eviction                  │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     Redis Distributed Cache         │
│     - Shared across instances       │
│     - TTL-based expiration          │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│     MongoDB Primary Database        │
│     - Source of truth               │
│     - Replica set for HA            │
└─────────────────────────────────────┘
```

### Cache Patterns

**1. Cache-Aside (Lazy Loading)**
```typescript
async getData(key: string) {
  // Try cache
  let data = await cache.get(key);
  if (data) return data;
  
  // Load from DB
  data = await db.find(key);
  
  // Populate cache
  await cache.set(key, data, TTL);
  return data;
}
```

**2. Write-Through**
```typescript
async updateData(key: string, data: any) {
  // Write to DB
  await db.update(key, data);
  
  // Update cache
  await cache.set(key, data, TTL);
}
```

**3. Write-Behind (Async)**
```typescript
async updateData(key: string, data: any) {
  // Update cache immediately
  await cache.set(key, data, TTL);
  
  // Queue DB write
  await queue.push({ operation: 'update', key, data });
}
```

### Cache Invalidation

**Strategies:**
1. **TTL-based**: All cache entries have expiration
2. **Event-driven**: Invalidate on data changes
3. **Manual**: Explicit cache clearing
4. **Pattern-based**: Invalidate by key pattern

**Example:**
```typescript
// Invalidate user cache on update
async invalidateUserCache(user_id: string) {
  const redis = RedisConnection.getClient();
  await redis.del(`user:${user_id}`);
  await redis.del(`user:profile:${user_id}`);
  await redis.del(`user:sessions:${user_id}`);
}
```

---

## Tenant Isolation

### Database-Level Isolation

Each tenant's data is logically isolated within collections:

```typescript
// All documents include tenant_id
{
  _id: ObjectId("..."),
  tenant_id: "tenant_123",
  user_id: "user_456",
  // ... other fields
}

// Queries always filter by tenant_id
db.collection('users').find({ tenant_id: tenant_id, user_id: user_id });
```

### Collection Indexes

All collections have compound indexes starting with `tenant_id`:

```javascript
// User collection indexes
db.users.createIndex({ tenant_id: 1, user_id: 1 }, { unique: true });
db.users.createIndex({ tenant_id: 1, email: 1 }, { unique: true });
db.users.createIndex({ tenant_id: 1, status: 1 });

// Session collection indexes
db.sessions.createIndex({ tenant_id: 1, session_id: 1 }, { unique: true });
db.sessions.createIndex({ tenant_id: 1, user_id: 1, is_active: 1 });
```

### Cache Isolation

Cache keys include tenant_id:

```typescript
const cacheKey = `${tenant_id}:user:${user_id}`;
await redis.set(cacheKey, userData, TTL);
```

---

## Connection Pooling

### MongoDB Connection Pool

**Configuration:**
```typescript
const mongoClient = new MongoClient(uri, {
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

**Singleton Pattern:**
```typescript
export class MongoDBConnection {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;

  static async connect() {
    if (this.client) return;
    
    this.client = new MongoClient(uri, options);
    await this.client.connect();
    this.db = this.client.db(dbName);
  }

  static getDb(): Db {
    if (!this.db) throw new Error('Database not connected');
    return this.db;
  }
}
```

### Redis Connection Pool

**Configuration:**
```typescript
const redis = new Redis({
  host: 'redis',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});
```

**Singleton Pattern:**
```typescript
export class RedisConnection {
  private static client: Redis | null = null;

  static async connect() {
    if (this.client) return;
    
    this.client = new Redis(options);
    await this.client.ping();
  }

  static getClient(): Redis {
    if (!this.client) throw new Error('Redis not connected');
    return this.client;
  }
}
```

---

## Event-Driven Architecture

### Outbox Pattern

For reliable event publishing, we use the outbox pattern:

```typescript
// Transaction with outbox
async function createUserWithEvents(userData: User) {
  const db = MongoDBConnection.getDb();
  const session = db.client.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Insert user
      await db.collection('users').insertOne(userData, { session });
      
      // Insert outbox event
      await db.collection('outbox').insertOne({
        event_id: uuidv4(),
        event_type: 'user.created',
        aggregate_id: userData.user_id,
        payload: userData,
        created_at: new Date(),
        processed: false,
      }, { session });
    });
  } finally {
    await session.endSession();
  }
}

// Background processor publishes events
async function processOutbox() {
  const events = await db.collection('outbox')
    .find({ processed: false })
    .limit(100)
    .toArray();
  
  for (const event of events) {
    await kafka.send({
      topic: 'platform.events',
      messages: [{ value: JSON.stringify(event.payload) }],
    });
    
    await db.collection('outbox').updateOne(
      { event_id: event.event_id },
      { $set: { processed: true, processed_at: new Date() } }
    );
  }
}
```

### Event Sourcing (Audit Logs)

Audit logs implement event sourcing principles:

```typescript
// Immutable audit log with hash chain
export class AuditRepository {
  async createAuditLog(data: AuditLog): Promise<AuditLog> {
    const db = MongoDBConnection.getDb();
    
    // Get previous hash
    const lastLog = await db.collection('audit_logs')
      .findOne({ tenant_id: data.tenant_id }, { sort: { created_at: -1 } });
    
    const auditLog = {
      audit_id: uuidv4(),
      ...data,
      previous_hash: lastLog?.hash || '0'.repeat(64),
      created_at: new Date(),
    };
    
    // Calculate hash
    auditLog.hash = this.calculateHash(auditLog);
    
    // Insert (immutable)
    await db.collection('audit_logs').insertOne(auditLog);
    
    return auditLog;
  }
}
```

---

## Data Migration Strategy

### Schema Versioning

All collections include a `schema_version` field:

```typescript
{
  _id: ObjectId("..."),
  schema_version: 1,
  // ... data fields
}
```

### Migration Process

1. **Deploy new code** with backward-compatible changes
2. **Run migration script** to update existing data
3. **Verify migration** with tests
4. **Remove old code** after migration complete

**Example Migration:**
```typescript
// Migration script
async function migrateUsersV1toV2() {
  const db = MongoDBConnection.getDb();
  
  const users = await db.collection('users')
    .find({ schema_version: { $exists: false } })
    .toArray();
  
  for (const user of users) {
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          schema_version: 2,
          // Add new fields with defaults
          preferences: user.preferences || {},
          updated_at: new Date(),
        },
      }
    );
  }
}
```

---

## Backup and Recovery

### Backup Strategy

**MongoDB Backups:**
- **Frequency**: Daily automated backups
- **Method**: mongodump with compression
- **Retention**: 30 days
- **Storage**: External backup storage

**Redis Backups:**
- **RDB snapshots**: Every 6 hours
- **AOF**: Continuous append-only file
- **Retention**: 7 days

### Recovery Procedures

**Point-in-Time Recovery:**
```bash
# Restore MongoDB from backup
mongorestore --host mongodb-primary:27017 \
  --username caas_admin \
  --password caas_secret_2026 \
  --authenticationDatabase admin \
  --gzip \
  --archive=/backups/caas_backup_2026-02-21.gz
```

**Disaster Recovery:**
1. Provision new infrastructure
2. Restore latest backup
3. Apply transaction logs
4. Verify data integrity
5. Update DNS/load balancer
6. Monitor for issues

---

## Performance Optimization

### Indexing Strategy

**Compound Indexes:**
```javascript
// Optimize for tenant-scoped queries
db.users.createIndex({ tenant_id: 1, email: 1 });
db.sessions.createIndex({ tenant_id: 1, user_id: 1, is_active: 1 });
db.audit_logs.createIndex({ tenant_id: 1, created_at: -1 });
```

**Covered Queries:**
```javascript
// Index covers the query - no document fetch needed
db.users.find(
  { tenant_id: "tenant_123", email: "user@example.com" },
  { _id: 0, user_id: 1, email: 1, status: 1 }
);
```

### Query Optimization

**Use Projections:**
```typescript
// Only fetch needed fields
const user = await db.collection('users').findOne(
  { user_id },
  { projection: { password_hash: 0, mfa_secret: 0 } }
);
```

**Batch Operations:**
```typescript
// Batch inserts
await db.collection('audit_logs').insertMany(auditLogs, { ordered: false });
```

**Aggregation Pipeline:**
```typescript
// Efficient aggregation
const stats = await db.collection('users').aggregate([
  { $match: { tenant_id, status: 'active' } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
]).toArray();
```

---

## Monitoring and Metrics

### Key Metrics

**MongoDB:**
- Connection pool utilization
- Query execution time
- Replica set lag
- Disk usage

**Redis:**
- Memory usage
- Cache hit rate
- Eviction rate
- Connection count

**Application:**
- Repository operation latency
- Cache hit/miss ratio
- Transaction success rate
- Error rates

### Health Checks

```typescript
async function checkStorageHealth() {
  const health = {
    mongodb: false,
    redis: false,
    timestamp: new Date(),
  };
  
  try {
    await MongoDBConnection.getDb().admin().ping();
    health.mongodb = true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
  }
  
  try {
    await RedisConnection.getClient().ping();
    health.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  return health;
}
```

---

## Best Practices

### 1. Always Use Repositories
- Never access MongoDB/Redis directly from controllers
- Use repository pattern for all data operations
- Centralize caching logic in repositories

### 2. Implement Proper Error Handling
- Catch and log database errors
- Implement retry logic for transient failures
- Use circuit breakers for external dependencies

### 3. Optimize for Performance
- Use indexes for all queries
- Implement caching for frequently accessed data
- Use projections to limit data transfer
- Batch operations when possible

### 4. Ensure Data Consistency
- Use transactions for multi-document operations
- Implement proper cache invalidation
- Use appropriate consistency models

### 5. Monitor and Alert
- Track key performance metrics
- Set up alerts for anomalies
- Regular performance reviews

---

## Conclusion

The CAAS platform implements a robust centralized storage architecture with:

- ✅ MongoDB replica set for high availability
- ✅ Redis caching for performance
- ✅ Repository pattern for consistency
- ✅ Tenant isolation for security
- ✅ Connection pooling for efficiency
- ✅ Event-driven architecture for scalability
- ✅ Comprehensive backup and recovery

This architecture provides a solid foundation for building scalable, reliable, and performant services.

---

**Document Version**: 1.0  
**Last Updated**: February 21, 2026  
**Maintained By**: Platform Team
