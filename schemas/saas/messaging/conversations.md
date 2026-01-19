# Conversations Schema

> **Collection**: `conversations`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores chat threads - direct messages, group chats, and channels

---

## Overview

A conversation is a container for messages between participants. Types include:

| Type | Description | Participants |
|------|-------------|--------------|
| `direct` | 1:1 private chat | Exactly 2 |
| `group` | Private group chat | 2-1000 |
| `channel` | Broadcast channel | 1 admin + unlimited subscribers |

---

## Schema Definition

```javascript
// conversations collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === IDENTIFICATION ===
  conversation_id: String,            // "conv_abc123xyz"
  
  // === TYPE ===
  type: String,                       // 'direct' | 'group' | 'channel'
  
  // === PARTICIPANTS ===
  participants: [{
    user_id: ObjectId,                // Reference to users._id
    external_user_id: String,         // Denormalized for quick lookup
    display_name: String,             // Denormalized, refreshed periodically
    avatar_url: String,               // Denormalized
    
    // Role in conversation
    role: String,                     // 'owner' | 'admin' | 'member' | 'subscriber'
    
    // Permissions (overrides for this conversation)
    permissions: {
      can_send_messages: Boolean,
      can_send_media: Boolean,
      can_add_members: Boolean,
      can_remove_members: Boolean,
      can_change_info: Boolean,
      can_pin_messages: Boolean,
      can_delete_messages: Boolean
    },
    
    // Participation status
    status: String,                   // 'active' | 'left' | 'removed' | 'banned'
    
    // Member settings
    settings: {
      muted: Boolean,
      muted_until: Date,
      pinned: Boolean,
      pinned_at: Date,
      archived: Boolean,
      archived_at: Date,
      notifications: String           // 'all' | 'mentions' | 'none'
    },
    
    // Timestamps
    joined_at: Date,
    invited_by: ObjectId,
    left_at: Date,
    removed_at: Date,
    last_read_message_id: ObjectId,   // Last message user has read
    last_read_at: Date
  }],
  
  // === METADATA (for groups/channels) ===
  metadata: {
    name: String,                     // Group name: "Pet Lovers Club"
    description: String,              // Group description
    avatar_url: String,               // Group icon
    
    // Customization
    theme: {
      background_url: String,         // Chat background
      color: String                   // Accent color
    },
    
    // Group settings
    settings: {
      join_approval_required: Boolean,
      only_admins_can_message: Boolean,
      only_admins_can_add_members: Boolean,
      message_retention_days: Number, // Auto-delete messages after X days
      slow_mode_seconds: Number       // Delay between messages (0 = off)
    },
    
    // Channel-specific
    channel: {
      is_public: Boolean,             // Discoverable in search
      invite_link: String,            // "https://caas.io/join/abc123"
      invite_link_enabled: Boolean,
      subscriber_count: Number        // Cached count
    }
  },
  
  // === LAST MESSAGE (Denormalized for list view) ===
  last_message: {
    message_id: ObjectId,
    sender_id: ObjectId,
    sender_name: String,
    content_preview: String,          // First 100 chars (may be encrypted indicator)
    content_type: String,             // 'text' | 'image' | 'file' | 'voice' | ...
    sent_at: Date,
    is_encrypted: Boolean
  },
  
  // === PINNED MESSAGES ===
  pinned_messages: [{
    message_id: ObjectId,
    pinned_by: ObjectId,
    pinned_at: Date
  }],
  
  // === STATISTICS ===
  stats: {
    message_count: Number,
    media_count: Number,
    file_count: Number,
    participant_count: Number,        // Active participants
    unread_count: Object              // { "user_id": count } - per-user unread
  },
  
  // === ENCRYPTION ===
  encryption: {
    enabled: Boolean,                 // E2E encryption active
    protocol: String,                 // 'signal' | 'custom'
    group_key_id: String,             // For group E2E (sender keys)
    key_version: Number,
    last_key_rotation_at: Date
  },
  
  // === STATUS ===
  status: String,                     // 'active' | 'archived' | 'deleted'
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,                   // Last activity
  deleted_at: Date
}
```

---

## Participant Roles

| Role | Capabilities |
|------|--------------|
| `owner` | Full control, cannot be removed, can delete conversation |
| `admin` | Manage members, change settings, pin messages |
| `member` | Send messages, react |
| `subscriber` | Read-only (channels) |

---

## Indexes

```javascript
// Primary lookups
db.conversations.createIndex({ "tenant_id": 1, "conversation_id": 1 }, { unique: true });

// User's conversations
db.conversations.createIndex({ 
  "tenant_id": 1, 
  "participants.user_id": 1, 
  "participants.status": 1,
  "updated_at": -1 
});

// Direct conversation lookup (find existing DM between two users)
db.conversations.createIndex({ 
  "tenant_id": 1, 
  "type": 1, 
  "participants.user_id": 1 
});

// List by status
db.conversations.createIndex({ "tenant_id": 1, "status": 1, "updated_at": -1 });

// Channel discovery
db.conversations.createIndex({ 
  "tenant_id": 1, 
  "type": 1, 
  "metadata.channel.is_public": 1 
}, { partialFilterExpression: { type: "channel" } });
```

---

## Sample Document (Group Chat)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440100"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  conversation_id: "conv_petlovers_m9k2",
  type: "group",
  
  participants: [
    {
      user_id: ObjectId("507f1f77bcf86cd799440001"),
      external_user_id: "user_12345_acme",
      display_name: "John Doe",
      avatar_url: "https://cdn.caas.io/avatars/usr_johndoe.jpg",
      role: "owner",
      permissions: {
        can_send_messages: true,
        can_send_media: true,
        can_add_members: true,
        can_remove_members: true,
        can_change_info: true,
        can_pin_messages: true,
        can_delete_messages: true
      },
      status: "active",
      settings: {
        muted: false,
        muted_until: null,
        pinned: true,
        pinned_at: ISODate("2024-01-10T00:00:00Z"),
        archived: false,
        archived_at: null,
        notifications: "all"
      },
      joined_at: ISODate("2024-01-01T00:00:00Z"),
      invited_by: null,
      left_at: null,
      removed_at: null,
      last_read_message_id: ObjectId("507f1f77bcf86cd799440250"),
      last_read_at: ISODate("2024-01-15T18:30:00Z")
    },
    {
      user_id: ObjectId("507f1f77bcf86cd799440002"),
      external_user_id: "user_67890_acme",
      display_name: "Jane Smith",
      avatar_url: "https://cdn.caas.io/avatars/usr_janesmith.jpg",
      role: "admin",
      permissions: {
        can_send_messages: true,
        can_send_media: true,
        can_add_members: true,
        can_remove_members: true,
        can_change_info: true,
        can_pin_messages: true,
        can_delete_messages: false
      },
      status: "active",
      settings: {
        muted: false,
        muted_until: null,
        pinned: false,
        pinned_at: null,
        archived: false,
        archived_at: null,
        notifications: "mentions"
      },
      joined_at: ISODate("2024-01-01T00:00:00Z"),
      invited_by: ObjectId("507f1f77bcf86cd799440001"),
      left_at: null,
      removed_at: null,
      last_read_message_id: ObjectId("507f1f77bcf86cd799440248"),
      last_read_at: ISODate("2024-01-15T18:00:00Z")
    }
    // ... more participants
  ],
  
  metadata: {
    name: "Pet Lovers Club 🐕🐈",
    description: "A group for pet enthusiasts to share tips and cute photos!",
    avatar_url: "https://cdn.caas.io/groups/petlovers.jpg",
    theme: {
      background_url: null,
      color: "#FF6B35"
    },
    settings: {
      join_approval_required: false,
      only_admins_can_message: false,
      only_admins_can_add_members: false,
      message_retention_days: 0,
      slow_mode_seconds: 0
    },
    channel: null
  },
  
  last_message: {
    message_id: ObjectId("507f1f77bcf86cd799440250"),
    sender_id: ObjectId("507f1f77bcf86cd799440001"),
    sender_name: "John Doe",
    content_preview: "Check out this photo of Max! 🐕",
    content_type: "image",
    sent_at: ISODate("2024-01-15T18:45:00Z"),
    is_encrypted: true
  },
  
  pinned_messages: [
    {
      message_id: ObjectId("507f1f77bcf86cd799440200"),
      pinned_by: ObjectId("507f1f77bcf86cd799440001"),
      pinned_at: ISODate("2024-01-05T00:00:00Z")
    }
  ],
  
  stats: {
    message_count: 1250,
    media_count: 89,
    file_count: 12,
    participant_count: 45
  },
  
  encryption: {
    enabled: true,
    protocol: "signal",
    group_key_id: "gk_petlovers_v2",
    key_version: 2,
    last_key_rotation_at: ISODate("2024-01-10T00:00:00Z")
  },
  
  status: "active",
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T18:45:00Z"),
  deleted_at: null
}
```

---

## Related Schemas

- [Messages](messages.md) - Messages in conversation
- [Users](../users/users.md) - Participants
- [Read Receipts](read_receipts.md) - Read status tracking
