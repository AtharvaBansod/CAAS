# Read Receipts Schema

> **Collection**: `read_receipts`  
> **Database**: Tenant-scoped  
> **Purpose**: Tracks message delivery and read status per user

---

## Overview

Read receipts track when messages are delivered and read. Stored separately for:
- Efficient updates without modifying messages
- Privacy controls (some users hide read receipts)
- Aggregation for "seen by X users" features

---

## Schema Definition

```javascript
// read_receipts collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === REFERENCES ===
  message_id: ObjectId,               // Reference to messages._id
  conversation_id: ObjectId,          // Denormalized
  
  // === USER ===
  user_id: ObjectId,                  // Who received/read
  
  // === STATUS ===
  status: String,                     // 'delivered' | 'read'
  
  // === TIMESTAMPS ===
  delivered_at: Date,
  read_at: Date,
  
  // === DEVICE INFO ===
  device_id: ObjectId,                // Which device received
  
  // === METADATA ===
  metadata: {
    is_visible: Boolean,              // User allows showing read status
    notification_shown: Boolean       // Was notification displayed
  }
}
```

---

## Indexes

```javascript
// Unique: one receipt per user per message
db.read_receipts.createIndex(
  { "tenant_id": 1, "message_id": 1, "user_id": 1 }, 
  { unique: true }
);

// Get receipts for a message
db.read_receipts.createIndex({ "tenant_id": 1, "message_id": 1, "status": 1 });

// Get unread messages for user in conversation
db.read_receipts.createIndex({ 
  "tenant_id": 1, 
  "conversation_id": 1, 
  "user_id": 1, 
  "status": 1 
});

// Cleanup old receipts
db.read_receipts.createIndex({ "read_at": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440500"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  message_id: ObjectId("507f1f77bcf86cd799440250"),
  conversation_id: ObjectId("507f1f77bcf86cd799440100"),
  
  user_id: ObjectId("507f1f77bcf86cd799440002"),
  
  status: "read",
  
  delivered_at: ISODate("2024-01-15T18:45:01Z"),
  read_at: ISODate("2024-01-15T18:46:00Z"),
  
  device_id: ObjectId("507f1f77bcf86cd799440020"),
  
  metadata: {
    is_visible: true,
    notification_shown: true
  }
}
```

---

## Related Schemas

- [Messages](messages.md) - Source message
