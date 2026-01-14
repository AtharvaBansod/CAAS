# Public Gateway - Rate Limiting Strategies

> **Parent Roadmap**: [Public Gateway](../../roadmaps/2_publicalllyExposedGateway.md)

---

## Overview

Distributed rate limiting implementation to protect the platform from abuse while ensuring fair usage across tenants.

---

## Tasks

### 1. Rate Limiting Architecture

#### 1.1 Rate Limit Strategies
```typescript
// Rate limiting configuration
interface RateLimitConfig {
  // Fixed window: X requests per time window
  fixedWindow: {
    limit: number;
    windowMs: number;
  };
  
  // Sliding window: Smoother rate limiting
  slidingWindow: {
    limit: number;
    windowMs: number;
  };
  
  // Token bucket: Allows bursts
  tokenBucket: {
    bucketSize: number;     // Max tokens
    refillRate: number;     // Tokens per second
  };
  
  // Leaky bucket: Smooths out traffic
  leakyBucket: {
    bucketSize: number;
    leakRate: number;       // Requests per second
  };
}
```
- [ ] Fixed window implementation
- [ ] Sliding window log implementation
- [ ] Sliding window counter implementation
- [ ] Token bucket implementation
- [ ] Leaky bucket implementation

### 2. Redis-Based Implementation

#### 2.1 Sliding Window Counter
```typescript
// Sliding window counter with Redis
async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const multi = redis.multi();
  
  // Remove old entries
  multi.zremrangebyscore(key, 0, windowStart);
  
  // Count remaining entries
  multi.zcard(key);
  
  // Add current request
  multi.zadd(key, now, `${now}:${Math.random()}`);
  
  // Set expiry
  multi.pexpire(key, windowMs);
  
  const results = await multi.exec();
  const count = results[1][1] as number;
  
  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count - 1),
    resetAt: now + windowMs
  };
}
```
- [ ] Sorted set based counting
- [ ] Atomic operations
- [ ] Memory cleanup
- [ ] Key expiration

#### 2.2 Token Bucket with Redis
```lua
-- Token bucket Lua script
local key = KEYS[1]
local now = tonumber(ARGV[1])
local bucket_size = tonumber(ARGV[2])
local refill_rate = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or bucket_size
local last_refill = tonumber(bucket[2]) or now

-- Calculate new tokens
local elapsed = now - last_refill
local new_tokens = elapsed * refill_rate / 1000
tokens = math.min(bucket_size, tokens + new_tokens)

-- Check if request allowed
if tokens >= requested then
    tokens = tokens - requested
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('PEXPIRE', key, 60000)
    return {1, tokens}
else
    return {0, tokens}
end
```
- [ ] Lua script for atomicity
- [ ] Token refill calculation
- [ ] Burst handling
- [ ] Script loading and caching

### 3. Rate Limit Tiers

#### 3.1 Tier Configuration
| Tier | Requests/min | Requests/hour | Burst |
|------|--------------|---------------|-------|
| Free | 60 | 1,000 | 10 |
| Starter | 300 | 10,000 | 50 |
| Pro | 1,000 | 50,000 | 200 |
| Enterprise | 5,000 | Unlimited | 1,000 |

- [ ] Tier definition system
- [ ] Dynamic tier lookup
- [ ] Override capabilities
- [ ] Custom limits per client

#### 3.2 Endpoint-Specific Limits
| Endpoint Group | Limit | Notes |
|---------------|-------|-------|
| Messages | 100/min | Per conversation |
| File Upload | 10/min | Per user |
| Auth | 5/min | Anti-brute force |
| Search | 30/min | Resource intensive |
| Webhooks | 1000/min | Higher for automation |

- [ ] Endpoint classification
- [ ] Limit configuration per endpoint
- [ ] Dynamic endpoint limits

### 4. Rate Limit Keys

#### 4.1 Key Strategies
```typescript
// Different key strategies
const keyStrategies = {
  // Per tenant (API key)
  tenant: (req) => `ratelimit:tenant:${req.tenantId}`,
  
  // Per user
  user: (req) => `ratelimit:user:${req.userId}`,
  
  // Per IP
  ip: (req) => `ratelimit:ip:${req.ip}`,
  
  // Per tenant + endpoint
  tenantEndpoint: (req) => 
    `ratelimit:tenant:${req.tenantId}:${req.path}`,
  
  // Composite: tenant + user
  composite: (req) => 
    `ratelimit:${req.tenantId}:${req.userId}`
};
```
- [ ] Tenant-level limiting
- [ ] User-level limiting
- [ ] IP-level limiting
- [ ] Endpoint-level limiting
- [ ] Composite key strategies

### 5. Response Headers

#### 5.1 Rate Limit Headers
```typescript
// Headers to include in response
res.setHeader('X-RateLimit-Limit', limit);
res.setHeader('X-RateLimit-Remaining', remaining);
res.setHeader('X-RateLimit-Reset', resetTimestamp);

// When limited
if (!allowed) {
  res.setHeader('Retry-After', retryAfterSeconds);
  res.status(429).json({
    error: 'Too Many Requests',
    retryAfter: retryAfterSeconds
  });
}
```
- [ ] X-RateLimit-Limit header
- [ ] X-RateLimit-Remaining header
- [ ] X-RateLimit-Reset header
- [ ] Retry-After header (429 responses)

### 6. Advanced Features

#### 6.1 Adaptive Rate Limiting
```typescript
// Adjust limits based on system load
async function getAdaptiveLimit(baseLimit: number): Promise<number> {
  const systemLoad = await getSystemMetrics();
  
  if (systemLoad.cpuUsage > 80) {
    return Math.floor(baseLimit * 0.5);
  }
  if (systemLoad.cpuUsage > 60) {
    return Math.floor(baseLimit * 0.75);
  }
  
  return baseLimit;
}
```
- [ ] System load monitoring
- [ ] Dynamic limit adjustment
- [ ] Priority queuing
- [ ] Graceful degradation

#### 6.2 Rate Limit Bypass
- [ ] Admin bypass tokens
- [ ] Webhook allowlist
- [ ] Internal service bypass
- [ ] Emergency bypass procedure

#### 6.3 Rate Limit Monitoring
- [ ] Prometheus metrics for limits hit
- [ ] Per-tenant usage dashboards
- [ ] Alert on excessive limiting
- [ ] Abuse detection

---

## Implementation Code

### Express Middleware
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit',
  points: 100,           // requests
  duration: 60,          // per 60 seconds
  blockDuration: 60,     // block for 60 seconds if exceeded
});

async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = `${req.tenantId}:${req.userId}`;
  
  try {
    const result = await rateLimiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext));
    
    next();
  } catch (rejection) {
    res.setHeader('Retry-After', Math.ceil(rejection.msBeforeNext / 1000));
    res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: Math.ceil(rejection.msBeforeNext / 1000)
    });
  }
}
```

---

## Testing

- [ ] Unit tests for each algorithm
- [ ] Load testing with rate limits
- [ ] Distributed scenario testing
- [ ] Failover testing (Redis down)
