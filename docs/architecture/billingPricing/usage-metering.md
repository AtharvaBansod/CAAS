# Billing & Pricing - Usage Metering

> **Parent Roadmap**: [Billing & Pricing](../../roadmaps/10_billingPricing.md)

---

## Overview

Real-time usage tracking and aggregation for billing purposes.

---

## 1. Metering Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Event Sources                         │
├────────────┬────────────┬────────────┬──────────────────┤
│ API Calls  │  Messages  │  Storage   │ Active Users     │
└─────┬──────┴─────┬──────┴─────┬──────┴────────┬─────────┘
      │            │            │               │
      └────────────┴────────────┴───────────────┘
                         │
                  ┌──────▼──────┐
                  │    Kafka    │
                  │(usage-events)│
                  └──────┬──────┘
                         │
               ┌─────────┴─────────┐
               │                   │
        ┌──────▼──────┐     ┌──────▼──────┐
        │  Real-time  │     │   Batch     │
        │  Aggregator │     │  Aggregator │
        └──────┬──────┘     └──────┬──────┘
               │                   │
        ┌──────▼──────┐     ┌──────▼──────┐
        │   Redis     │     │ TimescaleDB │
        │ (Counters)  │     │ (History)   │
        └─────────────┘     └─────────────┘
```

---

## 2. Usage Event Schema

```typescript
interface UsageEvent {
  id: string;
  type: 'message' | 'api_call' | 'storage' | 'call_minute' | 'mau';
  tenantId: string;
  userId?: string;
  timestamp: Date;
  quantity: number;
  unit: string;
  
  metadata: {
    endpoint?: string;           // For API calls
    conversationId?: string;     // For messages
    fileId?: string;             // For storage
    callType?: 'audio' | 'video'; // For calls
  };
}

// Example events
const messageEvent: UsageEvent = {
  id: 'evt_123',
  type: 'message',
  tenantId: 'tenant_abc',
  userId: 'user_456',
  timestamp: new Date(),
  quantity: 1,
  unit: 'message',
  metadata: { conversationId: 'conv_789' }
};

const storageEvent: UsageEvent = {
  id: 'evt_124',
  type: 'storage',
  tenantId: 'tenant_abc',
  timestamp: new Date(),
  quantity: 1024000,  // bytes
  unit: 'bytes',
  metadata: { fileId: 'file_xyz' }
};
```

---

## 3. Real-time Counters

```typescript
class UsageCounter {
  // Increment counter atomically
  async increment(tenantId: string, metric: string, amount = 1): Promise<void> {
    const key = `usage:${tenantId}:${metric}:${getCurrentPeriod()}`;
    
    await redis.incrby(key, amount);
    
    // Set expiry for cleanup
    await redis.expire(key, 86400 * 35); // Keep 35 days
  }
  
  // Get current period usage
  async getCurrentUsage(tenantId: string, metric: string): Promise<number> {
    const key = `usage:${tenantId}:${metric}:${getCurrentPeriod()}`;
    const value = await redis.get(key);
    return parseInt(value || '0', 10);
  }
  
  // Check if quota exceeded
  async checkQuota(tenantId: string, metric: string): Promise<QuotaStatus> {
    const current = await this.getCurrentUsage(tenantId, metric);
    const limit = await this.getLimit(tenantId, metric);
    
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      exceeded: current >= limit,
      percentUsed: (current / limit) * 100
    };
  }
}
```

---

## 4. MAU Tracking (HyperLogLog)

```typescript
// Track unique active users with HyperLogLog
class MAUTracker {
  async trackUser(tenantId: string, userId: string): Promise<void> {
    const key = `mau:${tenantId}:${getCurrentMonth()}`;
    await redis.pfadd(key, userId);
  }
  
  async getMAU(tenantId: string): Promise<number> {
    const key = `mau:${tenantId}:${getCurrentMonth()}`;
    return redis.pfcount(key);
  }
}
```

---

## 5. Aggregation Jobs

```typescript
// Hourly aggregation
async function aggregateHourlyUsage(): Promise<void> {
  const hour = format(subHours(new Date(), 1), 'yyyy-MM-dd-HH');
  
  // Get all metrics from Redis
  const keys = await redis.keys(`usage:*:*:${hour}`);
  
  for (const key of keys) {
    const [, tenantId, metric] = key.split(':');
    const value = await redis.get(key);
    
    // Store in TimescaleDB
    await db.execute(`
      INSERT INTO usage_metrics (tenant_id, metric, period, value, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (tenant_id, metric, period) 
      DO UPDATE SET value = usage_metrics.value + EXCLUDED.value
    `, [tenantId, metric, hour, value]);
  }
}

// Daily rollup
async function rollupDailyUsage(): Promise<void> {
  await db.execute(`
    INSERT INTO usage_daily (tenant_id, metric, date, value)
    SELECT 
      tenant_id, 
      metric, 
      DATE(period) as date,
      SUM(value) as value
    FROM usage_metrics
    WHERE period >= NOW() - INTERVAL '1 day'
    GROUP BY tenant_id, metric, DATE(period)
    ON CONFLICT (tenant_id, metric, date)
    DO UPDATE SET value = EXCLUDED.value
  `);
}
```

---

## 6. Usage API

```typescript
// GET /api/usage?metric=messages&period=month
router.get('/usage', async (req, res) => {
  const { metric, period, startDate, endDate } = req.query;
  
  const usage = await usageService.getUsage({
    tenantId: req.tenantId,
    metric,
    period,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  });
  
  res.json(usage);
});

// GET /api/usage/quota
router.get('/usage/quota', async (req, res) => {
  const quotas = await Promise.all([
    usageCounter.checkQuota(req.tenantId, 'messages'),
    usageCounter.checkQuota(req.tenantId, 'api_calls'),
    usageCounter.checkQuota(req.tenantId, 'storage'),
    mauTracker.getMAU(req.tenantId)
  ]);
  
  res.json({
    messages: quotas[0],
    apiCalls: quotas[1],
    storage: quotas[2],
    mau: quotas[3]
  });
});
```

---

## Related Documents
- [Billing Architecture](./billing-architecture.md)
- [Usage Metering Flow](../../flowdiagram/usage-metering.md)
