# Usage Records Schema

> **Collection**: `usage_records`  
> **Database**: `caas_billing` (or TimescaleDB)  
> **Purpose**: Tracks metered usage for billing calculations

---

## Overview

Usage records track billable metrics like messages sent, API calls, storage, etc.

---

## Schema Definition

```javascript
// usage_records collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  client_id: ObjectId,
  tenant_id: String,
  
  // === METRIC ===
  metric_type: String,                // 'messages' | 'api_calls' | 'storage' | 'mau' | 'call_minutes'
  
  // === TIME BUCKET ===
  bucket: {
    type: String,                     // 'hourly' | 'daily' | 'monthly'
    start: Date,
    end: Date
  },
  
  // === VALUE ===
  value: Number,                      // Count or amount
  unit: String,                       // 'count' | 'bytes' | 'minutes'
  
  // === DIMENSIONS ===
  dimensions: {
    app_id: ObjectId,
    environment: String,              // 'production' | 'staging'
    endpoint: String,                 // For API calls: '/messages'
    content_type: String              // For messages: 'text' | 'image'
  },
  
  // === BILLING ===
  billing: {
    billable: Boolean,
    included_in_plan: Number,         // Amount covered by plan
    overage: Number,                  // Amount exceeding plan
    billed_at: Date,
    invoice_id: ObjectId
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.usage_records.createIndex({ 
  "client_id": 1, 
  "metric_type": 1, 
  "bucket.start": -1 
});

db.usage_records.createIndex({ 
  "tenant_id": 1, 
  "metric_type": 1, 
  "bucket.type": 1, 
  "bucket.start": -1 
});

db.usage_records.createIndex({ "billing.invoice_id": 1 });
```

---

## Related Schemas

- [Subscriptions](subscriptions.md) - Plan limits
- [Invoices](invoices.md) - Billed usage
