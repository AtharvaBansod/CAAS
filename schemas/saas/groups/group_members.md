# Group Members Schema

> **Collection**: `group_members`  
> **Database**: Tenant-scoped  
> **Purpose**: Detailed membership tracking for large groups (when embedded in conversations is impractical)

---

## Overview

For groups with many members (100+), we store membership in a separate collection for efficiency. Smaller groups can use the embedded participants array in conversations.

---

## Schema Definition

```javascript
// group_members collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === REFERENCES ===
  conversation_id: ObjectId,          // Reference to conversations._id
  user_id: ObjectId,                  // Reference to users._id
  
  // === MEMBER INFO (Denormalized) ===
  external_user_id: String,
  display_name: String,
  avatar_url: String,
  
  // === ROLE & PERMISSIONS ===
  role: String,                       // 'owner' | 'admin' | 'moderator' | 'member'
  permissions: {
    can_send_messages: Boolean,
    can_send_media: Boolean,
    can_add_members: Boolean,
    can_remove_members: Boolean,
    can_change_info: Boolean,
    can_pin_messages: Boolean,
    can_delete_messages: Boolean,
    can_start_calls: Boolean
  },
  
  // === STATUS ===
  status: String,                     // 'active' | 'muted' | 'left' | 'removed' | 'banned'
  
  // === SETTINGS ===
  settings: {
    notifications: String,            // 'all' | 'mentions' | 'none'
    muted: Boolean,
    muted_until: Date,
    pinned: Boolean
  },
  
  // === ACTIVITY ===
  activity: {
    joined_at: Date,
    invited_by: ObjectId,
    last_message_at: Date,
    message_count: Number,
    last_read_message_id: ObjectId,
    last_read_at: Date
  },
  
  // === DEPARTURE ===
  departure: {
    left_at: Date,
    removed_at: Date,
    removed_by: ObjectId,
    removal_reason: String,
    banned_until: Date
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
// Unique membership
db.group_members.createIndex(
  { "tenant_id": 1, "conversation_id": 1, "user_id": 1 }, 
  { unique: true }
);

// List members of group
db.group_members.createIndex({ 
  "tenant_id": 1, 
  "conversation_id": 1, 
  "status": 1, 
  "role": 1 
});

// User's groups
db.group_members.createIndex({ 
  "tenant_id": 1, 
  "user_id": 1, 
  "status": 1 
});
```

---

## Related Schemas

- [Conversations](../messaging/conversations.md) - Parent conversation
- [Groups](groups.md) - Extended group info
- [Users](../users/users.md) - Member user
