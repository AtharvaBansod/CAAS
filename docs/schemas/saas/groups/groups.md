# Groups Schema

> **Collection**: `groups`  
> **Database**: Tenant-scoped  
> **Purpose**: Extended group metadata beyond what's stored in conversations

---

## Overview

Groups collection stores extended metadata for group chats that doesn't fit in the conversations collection. This is optional - basic groups work with just the conversation document.

---

## Schema Definition

```javascript
// groups collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === REFERENCE ===
  group_id: String,                   // "grp_abc123xyz"
  conversation_id: ObjectId,          // Reference to conversations._id
  
  // === EXTENDED METADATA ===
  metadata: {
    category: String,                 // 'social' | 'work' | 'family' | 'custom'
    tags: [String],
    
    // Invite management
    invite_link: String,              // Unique invite code
    invite_link_enabled: Boolean,
    invite_link_expires_at: Date,
    invite_link_uses: Number,
    invite_link_max_uses: Number,
    
    // Discovery
    is_discoverable: Boolean,
    search_keywords: [String]
  },
  
  // === RULES ===
  rules: [{
    rule_number: Number,
    title: String,
    description: String,
    added_at: Date,
    added_by: ObjectId
  }],
  
  // === ANNOUNCEMENTS ===
  announcements: [{
    announcement_id: String,
    title: String,
    content: String,
    author_id: ObjectId,
    pinned: Boolean,
    created_at: Date,
    expires_at: Date
  }],
  
  // === SCHEDULED EVENTS ===
  events: [{
    event_id: String,
    title: String,
    description: String,
    start_time: Date,
    end_time: Date,
    location: String,
    created_by: ObjectId,
    attendees: [ObjectId],
    status: String                    // 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  }],
  
  // === MODERATION ===
  moderation: {
    auto_moderation_enabled: Boolean,
    blocked_words: [String],
    spam_detection_enabled: Boolean,
    
    warnings_log: [{
      user_id: ObjectId,
      reason: String,
      warned_by: ObjectId,
      warned_at: Date
    }],
    
    bans_log: [{
      user_id: ObjectId,
      reason: String,
      banned_by: ObjectId,
      banned_at: Date,
      expires_at: Date
    }]
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.groups.createIndex({ "tenant_id": 1, "group_id": 1 }, { unique: true });
db.groups.createIndex({ "tenant_id": 1, "conversation_id": 1 }, { unique: true });
db.groups.createIndex({ "metadata.invite_link": 1 }, { unique: true, sparse: true });
db.groups.createIndex({ "tenant_id": 1, "metadata.is_discoverable": 1 });
```

---

## Related Schemas

- [Conversations](../messaging/conversations.md) - Parent conversation
- [Group Members](group_members.md) - Membership details
