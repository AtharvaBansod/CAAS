# User Relationships Schema

> **Collection**: `user_relationships`  
> **Database**: Tenant-scoped  
> **Purpose**: Tracks relationships between users (contacts, friends, blocked users)

---

## Overview

Relationships define how users connect with each other. This enables:
- Contact lists / Friends
- Blocking users
- Muting notifications
- Following (for public profiles)

---

## Schema Definition

```javascript
// user_relationships collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === RELATIONSHIP ===
  // Always stored with lower user_id first for consistency
  user_id: ObjectId,                  // User who initiated
  target_user_id: ObjectId,           // Target user
  
  // === TYPE ===
  type: String,                       // 'contact' | 'friend' | 'blocked' | 'muted' | 'following'
  
  // === STATUS ===
  status: String,                     // 'pending' | 'accepted' | 'rejected' | 'active'
  
  // === MUTUAL FLAGS ===
  is_mutual: Boolean,                 // Both users have this relationship
  
  // === FRIENDSHIP SPECIFIC ===
  friendship: {
    requested_at: Date,
    accepted_at: Date,
    rejected_at: Date,
    rejection_reason: String,
    
    // Favorites / close friends
    is_favorite: Boolean,
    favorited_at: Date,
    
    // Nickname
    nickname: String                  // Custom display name
  },
  
  // === BLOCKING ===
  blocking: {
    blocked_at: Date,
    reason: String,                   // User's reason (optional)
    report_id: ObjectId               // Associated report if any
  },
  
  // === MUTING ===
  muting: {
    muted_at: Date,
    mute_notifications: Boolean,
    mute_stories: Boolean,
    mute_calls: Boolean,
    mute_until: Date                  // null = permanent
  },
  
  // === FOLLOWING ===
  following: {
    followed_at: Date,
    notifications_enabled: Boolean
  },
  
  // === METADATA ===
  metadata: {
    source: String,                   // 'search' | 'qr_code' | 'group' | 'imported'
    imported_from: String,            // 'contacts' | 'facebook' | etc.
    notes: String                     // Private notes about this person
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Relationship Types

| Type | Description | Mutual |
|------|-------------|--------|
| `contact` | Saved contact, can message | No |
| `friend` | Mutual friendship | Yes (requires acceptance) |
| `blocked` | Cannot interact | No (one-way) |
| `muted` | Can interact, no notifications | No |
| `following` | Public profile following | No |

---

## Indexes

```javascript
// Unique compound index (one relationship per pair per type)
db.user_relationships.createIndex(
  { "tenant_id": 1, "user_id": 1, "target_user_id": 1, "type": 1 }, 
  { unique: true }
);

// Query user's relationships
db.user_relationships.createIndex({ "tenant_id": 1, "user_id": 1, "type": 1, "status": 1 });

// Find who has added this user
db.user_relationships.createIndex({ "tenant_id": 1, "target_user_id": 1, "type": 1 });

// Find blocked relationships for filtering
db.user_relationships.createIndex({ "tenant_id": 1, "user_id": 1, "type": 1 }, 
  { partialFilterExpression: { type: "blocked" } }
);
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440030"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: ObjectId("507f1f77bcf86cd799440001"),      // John
  target_user_id: ObjectId("507f1f77bcf86cd799440002"), // Jane
  
  type: "friend",
  status: "accepted",
  is_mutual: true,
  
  friendship: {
    requested_at: ISODate("2024-01-01T00:00:00Z"),
    accepted_at: ISODate("2024-01-01T01:00:00Z"),
    rejected_at: null,
    rejection_reason: null,
    is_favorite: true,
    favorited_at: ISODate("2024-01-05T00:00:00Z"),
    nickname: "Jane (Work)"
  },
  
  blocking: null,
  muting: null,
  following: null,
  
  metadata: {
    source: "search",
    imported_from: null,
    notes: "Met at pet park"
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-05T00:00:00Z")
}
```

---

## Related Schemas

- [Users](users.md) - Related users
