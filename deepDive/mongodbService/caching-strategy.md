# MongoDB Service - Caching Strategy

> **Parent Roadmap**: [MongoDB Service](../../roadmaps/4_mongodbService.md)

---

## Overview

Multi-layer caching strategy to optimize read performance and reduce database load.

---

## Tasks

### 1. Cache Architecture

#### 1.1 Cache Layers
```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               L1: In-Memory Cache                    │
│          (Node.js process, < 100ms TTL)             │
└────────────────────────┬────────────────────────────┘
                         │ miss
                         ▼
┌─────────────────────────────────────────────────────┐
│               L2: Redis Cache                        │
│           (Shared, configurable TTL)                 │
└────────────────────────┬────────────────────────────┘
                         │ miss
                         ▼
┌─────────────────────────────────────────────────────┐
│                    MongoDB                           │
└─────────────────────────────────────────────────────┘
```
- [ ] In-memory cache (LRU)
- [ ] Redis distributed cache
- [ ] Cache-aside pattern
- [ ] Read-through pattern

#### 1.2 Cache Key Design
```typescript
// Cache key patterns
const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  conversation: (convId: string) => `conv:${convId}`,
  conversationList: (userId: string) => `conv_list:${userId}`,
  messages: (convId: string, page: number) => `msgs:${convId}:${page}`,
  presence: (userId: string) => `presence:${userId}`,
  settings: (userId: string) => `settings:${userId}`,
  tenant: (tenantId: string) => `tenant:${tenantId}`
};
```
- [ ] Key naming convention
- [ ] Tenant isolation in keys
- [ ] Version in keys (for invalidation)

### 2. Cache-Aside Implementation

#### 2.1 Read Pattern
```typescript
async function getUser(userId: string): Promise<User | null> {
  // Check L1 (memory)
  const l1Key = cacheKeys.user(userId);
  let user = memoryCache.get(l1Key);
  if (user) return user;
  
  // Check L2 (Redis)
  const cached = await redis.get(l1Key);
  if (cached) {
    user = JSON.parse(cached);
    memoryCache.set(l1Key, user, { ttl: 10000 }); // 10s L1
    return user;
  }
  
  // Fetch from database
  user = await db.users.findById(userId);
  if (user) {
    await redis.setex(l1Key, 300, JSON.stringify(user)); // 5min L2
    memoryCache.set(l1Key, user, { ttl: 10000 });
  }
  
  return user;
}
```
- [ ] L1 lookup
- [ ] L2 lookup
- [ ] Database fallback
- [ ] Cache population

#### 2.2 Write Pattern
```typescript
async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  // Update database first
  const user = await db.users.findByIdAndUpdate(userId, updates, { new: true });
  
  // Invalidate caches
  const key = cacheKeys.user(userId);
  memoryCache.delete(key);
  await redis.del(key);
  
  // Optionally: populate cache with new value
  await redis.setex(key, 300, JSON.stringify(user));
  
  return user;
}
```
- [ ] Database-first writes
- [ ] Cache invalidation
- [ ] Write-through option
- [ ] Broadcast invalidation

### 3. Cache Invalidation

#### 3.1 Invalidation Strategies
```typescript
// Invalidation service
class CacheInvalidator {
  // Invalidate single key
  async invalidate(key: string): Promise<void> {
    memoryCache.delete(key);
    await redis.del(key);
  }
  
  // Invalidate by pattern
  async invalidatePattern(pattern: string): Promise<void> {
    // Redis SCAN for pattern
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [newCursor, matchedKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      keys.push(...matchedKeys);
    } while (cursor !== '0');
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    // Clear memory cache by pattern
    memoryCache.clearPattern(pattern);
  }
  
  // Broadcast invalidation to all instances
  async broadcastInvalidation(key: string): Promise<void> {
    await redis.publish('cache:invalidate', key);
  }
}
```
- [ ] Single key invalidation
- [ ] Pattern invalidation
- [ ] Pub/Sub invalidation broadcast
- [ ] Cascade invalidation

#### 3.2 Invalidation Triggers
| Event | Keys to Invalidate |
|-------|-------------------|
| User update | `user:{id}` |
| Message sent | `msgs:{convId}:*`, `conv:{convId}` |
| User joins conversation | `conv_list:{userId}`, `conv:{convId}` |
| Settings change | `settings:{userId}` |

- [ ] Event-to-invalidation mapping
- [ ] Automatic invalidation hooks
- [ ] Batch invalidation

### 4. Cache Warming

#### 4.1 Startup Warming
```typescript
// Warm cache on service startup
async function warmCache(): Promise<void> {
  // Warm most active tenants
  const activeTenants = await db.analytics.getActiveTenants(100);
  for (const tenant of activeTenants) {
    await cacheService.warmTenant(tenant.id);
  }
  
  // Warm hot conversations
  const hotConversations = await db.analytics.getHotConversations(1000);
  for (const conv of hotConversations) {
    await cacheService.warmConversation(conv.id);
  }
}
```
- [ ] Identify hot data
- [ ] Background warming
- [ ] Warming priority queue
- [ ] Warming metrics

#### 4.2 Predictive Warming
- [ ] User login warming
- [ ] Conversation open warming
- [ ] Time-based warming (peak hours)

### 5. Cache Configuration

#### 5.1 TTL Configuration
| Data Type | L1 TTL | L2 TTL | Rationale |
|-----------|--------|--------|-----------|
| User profile | 10s | 5min | Moderate update frequency |
| Presence | 1s | 30s | High update frequency |
| Messages | 30s | 5min | Append-only, rarely updated |
| Settings | 1min | 15min | Rarely updated |
| Tenant config | 5min | 30min | Admin changes only |

- [ ] Per-entity TTL configuration
- [ ] TTL tuning based on metrics
- [ ] Adaptive TTL

#### 5.2 Memory Limits
```typescript
// Memory cache configuration
const memoryCacheConfig = {
  maxSize: 100 * 1024 * 1024,  // 100MB
  maxItems: 50000,
  evictionPolicy: 'lru',
  updateAgeOnGet: true
};
```
- [ ] L1 size limits
- [ ] LRU eviction
- [ ] Memory monitoring
- [ ] Eviction alerts

### 6. Cache Monitoring

#### 6.1 Metrics
```typescript
// Cache metrics
const cacheMetrics = {
  hits: new Counter('cache_hits_total'),
  misses: new Counter('cache_misses_total'),
  latency: new Histogram('cache_latency_seconds'),
  size: new Gauge('cache_size_bytes'),
  keys: new Gauge('cache_keys_total'),
  evictions: new Counter('cache_evictions_total')
};
```
- [ ] Hit/miss tracking
- [ ] Hit rate calculation
- [ ] Latency tracking
- [ ] Size monitoring

#### 6.2 Alerting
| Condition | Alert |
|-----------|-------|
| Hit rate < 70% | Warning |
| Hit rate < 50% | Critical |
| L1 memory > 80% | Warning |
| Redis latency > 10ms | Warning |

---

## Best Practices

- Never cache null/empty results (negative caching) without short TTL
- Use cache stampede prevention (locking)
- Monitor cache effectiveness continuously
- Invalidate rather than update when in doubt
- Use consistent hashing for distributed cache

---

## Related Documents

- [Query Optimization Guide](./query-optimization.md)
- [Data Access Flow](../../flowdiagram/data-access-flow.md)
