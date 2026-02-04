# Reactions Schema

> **Collection**: `reactions`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores individual emoji reactions on messages

---

## Overview

Reactions are stored separately from messages for:
- Efficient reaction updates without modifying message document
- Easy aggregation for reaction summaries
- Support for custom emoji/stickers

---

## Schema Definition

```javascript
// reactions collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === REFERENCES ===
  message_id: ObjectId,               // Reference to messages._id
  conversation_id: ObjectId,          // Denormalized for queries
  
  // === REACTOR ===
  user_id: ObjectId,                  // Who reacted
  
  // === REACTION ===
  emoji: String,                      // "👍" or custom emoji code
  emoji_type: String,                 // 'unicode' | 'custom' | 'sticker'
  custom_emoji_id: String,            // For custom emojis: "emoji_fire_custom"
  custom_emoji_url: String,           // URL for custom emoji image
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date                    // If user changes reaction
}
```

---

## Indexes

```javascript
// Unique: one reaction type per user per message
db.reactions.createIndex(
  { "tenant_id": 1, "message_id": 1, "user_id": 1, "emoji": 1 }, 
  { unique: true }
);

// Get all reactions for a message
db.reactions.createIndex({ "tenant_id": 1, "message_id": 1 });

// Get user's reactions
db.reactions.createIndex({ "tenant_id": 1, "user_id": 1, "created_at": -1 });

// Aggregate by emoji
db.reactions.createIndex({ "tenant_id": 1, "message_id": 1, "emoji": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440400"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  message_id: ObjectId("507f1f77bcf86cd799440250"),
  conversation_id: ObjectId("507f1f77bcf86cd799440100"),
  
  user_id: ObjectId("507f1f77bcf86cd799440002"),
  
  emoji: "❤️",
  emoji_type: "unicode",
  custom_emoji_id: null,
  custom_emoji_url: null,
  
  created_at: ISODate("2024-01-15T18:46:30Z"),
  updated_at: ISODate("2024-01-15T18:46:30Z")
}
```

---

## Related Schemas

- [Messages](messages.md) - Reacted message
