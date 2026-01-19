# Metrics Schema

> **Collection**: `metrics`  
> **Database**: `caas_analytics`  
> **Purpose**: Stores aggregated metrics for dashboards and reporting

---

## Schema Definition

```javascript
// metrics collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  tenant_id: String,
  app_id: ObjectId,
  
  // === METRIC ===
  metric_name: String,                // 'mau', 'dau', 'messages_sent', 'avg_response_time'
  
  // === TIME BUCKET ===
  bucket: {
    type: String,                     // 'hourly' | 'daily' | 'weekly' | 'monthly'
    timestamp: Date                   // Start of bucket
  },
  
  // === VALUES ===
  value: Number,                      // Primary value
  values: {                           // Additional values
    count: Number,
    sum: Number,
    min: Number,
    max: Number,
    avg: Number,
    p50: Number,
    p95: Number,
    p99: Number
  },
  
  // === DIMENSIONS ===
  dimensions: {
    platform: String,
    country: String,
    user_segment: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.metrics.createIndex({ 
  "tenant_id": 1, 
  "metric_name": 1, 
  "bucket.type": 1, 
  "bucket.timestamp": -1 
});

db.metrics.createIndex({ 
  "tenant_id": 1, 
  "app_id": 1, 
  "metric_name": 1, 
  "bucket.timestamp": -1 
});
```

---

## Related Schemas

- [Events](events.md) - Source events
