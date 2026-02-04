# Events Schema

> **Collection**: `events`  
> **Database**: `caas_analytics`  
> **Purpose**: Stores activity events for analytics and monitoring

---

## Overview

Events track all significant actions for analytics, debugging, and audit.

---

## Schema Definition

```javascript
// events collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  event_id: String,                   // "evt_abc123xyz"
  
  // === CONTEXT ===
  tenant_id: String,
  app_id: ObjectId,
  user_id: ObjectId,                  // Actor
  
  // === EVENT TYPE ===
  category: String,                   // 'message' | 'user' | 'call' | 'file' | 'auth'
  action: String,                     // 'sent' | 'created' | 'deleted' | 'login'
  
  // Full event type
  event_type: String,                 // 'message.sent', 'user.login', etc.
  
  // === PAYLOAD ===
  data: {
    // Event-specific data
    resource_type: String,            // 'message' | 'conversation' | 'user'
    resource_id: ObjectId,
    
    // Additional context
    metadata: Object
  },
  
  // === SOURCE ===
  source: {
    ip: String,
    user_agent: String,
    device_id: ObjectId,
    platform: String,                 // 'web' | 'ios' | 'android'
    app_version: String
  },
  
  // === TIMESTAMP ===
  timestamp: Date,
  
  // === PROCESSING ===
  processed: Boolean,
  processed_at: Date
}
```

---

## Indexes

```javascript
db.events.createIndex({ "event_id": 1 }, { unique: true });
db.events.createIndex({ "tenant_id": 1, "event_type": 1, "timestamp": -1 });
db.events.createIndex({ "tenant_id": 1, "user_id": 1, "timestamp": -1 });
db.events.createIndex({ "timestamp": 1 }, { 
  expireAfterSeconds: 7776000   // 90 days retention
});
```

---

## Related Schemas

- [Metrics](metrics.md) - Aggregated from events
