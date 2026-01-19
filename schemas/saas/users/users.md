# Users Schema

> **Collection**: `users`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores end user profiles - the people who actually use the chat features

---

## Overview

The `users` collection stores **end users** - customers of SAAS clients who use the chat functionality. These are NOT admin users; they are the actual chat participants.

```
SAAS Client (Acme Pet Social)
└── End Users
    ├── John (pet owner) - uses chat
    ├── Jane (pet owner) - uses chat  
    └── Vet Clinic (business) - uses chat
```

---

## Schema Definition

```javascript
// users collection
{
  _id: ObjectId,
  tenant_id: String,                  // SAAS client identifier
  
  // === IDENTIFICATION ===
  user_id: String,                    // Internal: "usr_abc123xyz"
  external_id: String,                // SAAS app's user ID (their database)
  
  // === PROFILE ===
  profile: {
    display_name: String,             // "John Doe"
    username: String,                 // "@johndoe" (unique per tenant)
    avatar_url: String,
    bio: String,                      // Short bio (max 160 chars)
    
    // Extended profile (optional)
    first_name: String,
    last_name: String,
    email: String,                    // May or may not be provided by SAAS
    phone: String,
    
    // Custom fields from SAAS
    custom_data: Object               // { "pet_type": "dog", "premium": true }
  },
  
  // === STATUS ===
  status: {
    state: String,                    // 'online' | 'offline' | 'away' | 'dnd' | 'invisible'
    message: String,                  // Custom status: "Walking my dog 🐕"
    emoji: String,                    // Status emoji
    expires_at: Date,                 // Auto-clear status
    last_changed_at: Date
  },
  
  // === PRESENCE ===
  presence: {
    is_online: Boolean,
    last_seen: Date,
    last_active_at: Date,             // Last meaningful action
    current_device: String,           // Device ID currently active
    active_conversation_id: ObjectId  // Currently viewing conversation
  },
  
  // === SETTINGS ===
  settings: {
    notifications: {
      push_enabled: Boolean,
      email_enabled: Boolean,
      sound_enabled: Boolean,
      vibrate_enabled: Boolean,
      mute_all: Boolean,
      mute_until: Date,
      quiet_hours: {
        enabled: Boolean,
        start: String,                // "22:00"
        end: String,                  // "08:00"
        timezone: String
      }
    },
    privacy: {
      show_online_status: Boolean,    // Show online/offline to others
      show_last_seen: Boolean,
      show_read_receipts: Boolean,
      show_typing_indicator: Boolean,
      allow_message_requests: String, // 'everyone' | 'contacts' | 'none'
      profile_visibility: String      // 'public' | 'contacts' | 'private'
    },
    chat: {
      theme: String,                  // 'light' | 'dark' | 'system'
      language: String,               // 'en' | 'es' | ...
      message_preview: Boolean,       // Show message preview in notifications
      enter_to_send: Boolean,
      font_size: String               // 'small' | 'medium' | 'large'
    }
  },
  
  // === ENCRYPTION KEYS ===
  encryption: {
    identity_key: {
      public_key: String,             // Base64 encoded public key
      key_id: String,
      created_at: Date
    },
    signed_prekey: {
      public_key: String,
      key_id: String,
      signature: String,
      created_at: Date
    },
    registered_at: Date,              // When E2E was setup
    key_version: Number               // For key rotation tracking
  },
  
  // === STATISTICS ===
  stats: {
    conversations_count: Number,
    messages_sent: Number,
    messages_received: Number,
    files_shared: Number,
    calls_made: Number,
    call_minutes: Number,
    joined_groups: Number
  },
  
  // === ROLES & PERMISSIONS ===
  roles: [String],                    // ['user', 'moderator', 'vip']
  permissions: {
    can_create_groups: Boolean,
    can_start_calls: Boolean,
    can_share_files: Boolean,
    max_file_size_mb: Number,
    max_group_members: Number
  },
  
  // === MODERATION ===
  moderation: {
    is_banned: Boolean,
    ban_reason: String,
    banned_until: Date,               // null = permanent
    banned_by: ObjectId,              // Admin who banned
    warnings: [{
      reason: String,
      issued_at: Date,
      issued_by: ObjectId
    }],
    reports_against: Number           // Count of reports received
  },
  
  // === METADATA FROM SAAS ===
  saas_metadata: {
    tier: String,                     // User's tier in SAAS app
    subscription_status: String,
    registered_via: String,           // 'mobile' | 'web' | 'api'
    referrer_id: String,
    tags: [String]                    // SAAS-defined tags
  },
  
  // === TIMESTAMPS ===
  created_at: Date,                   // When registered with CAAS
  updated_at: Date,
  deleted_at: Date,                   // Soft delete
  
  // === VERSION ===
  __v: Number
}
```

---

## Field Descriptions

### Status States

| State | Description |
|-------|-------------|
| `online` | Actively using the app |
| `offline` | Not connected |
| `away` | Connected but inactive (auto-set after 5 min) |
| `dnd` | Do Not Disturb - no notifications |
| `invisible` | Online but appears offline |

### Role System

SAAS clients can define custom roles. Default roles:

| Role | Capabilities |
|------|--------------|
| `user` | Basic chat functionality |
| `moderator` | Can warn/mute users, delete messages |
| `vip` | Priority support, extra features |
| `admin` | Full control within tenant |

---

## Indexes

```javascript
// Primary indexes
db.users.createIndex({ "tenant_id": 1, "user_id": 1 }, { unique: true });
db.users.createIndex({ "tenant_id": 1, "external_id": 1 }, { unique: true });
db.users.createIndex({ "tenant_id": 1, "profile.username": 1 }, { unique: true, sparse: true });

// Query optimization
db.users.createIndex({ "tenant_id": 1, "presence.is_online": 1 });
db.users.createIndex({ "tenant_id": 1, "presence.last_seen": -1 });
db.users.createIndex({ "tenant_id": 1, "created_at": -1 });

// Search indexes
db.users.createIndex({ "tenant_id": 1, "profile.display_name": "text" });

// Full-text search (Atlas Search recommended for production)
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440001"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: "usr_johndoe_m3k9",
  external_id: "user_12345_acme",
  
  profile: {
    display_name: "John Doe",
    username: "johndoe",
    avatar_url: "https://cdn.caas.io/avatars/usr_johndoe.jpg",
    bio: "Dog lover 🐕 | San Francisco",
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    phone: "+1-555-123-4567",
    custom_data: {
      pet_type: "dog",
      pet_name: "Max",
      premium_member: true
    }
  },
  
  status: {
    state: "online",
    message: "Walking Max 🐕",
    emoji: "🐕",
    expires_at: ISODate("2024-01-15T20:00:00Z"),
    last_changed_at: ISODate("2024-01-15T18:00:00Z")
  },
  
  presence: {
    is_online: true,
    last_seen: ISODate("2024-01-15T18:45:00Z"),
    last_active_at: ISODate("2024-01-15T18:45:00Z"),
    current_device: "dev_iphone_x9k2",
    active_conversation_id: ObjectId("507f1f77bcf86cd799440100")
  },
  
  settings: {
    notifications: {
      push_enabled: true,
      email_enabled: false,
      sound_enabled: true,
      vibrate_enabled: true,
      mute_all: false,
      mute_until: null,
      quiet_hours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "America/Los_Angeles"
      }
    },
    privacy: {
      show_online_status: true,
      show_last_seen: true,
      show_read_receipts: true,
      show_typing_indicator: true,
      allow_message_requests: "contacts",
      profile_visibility: "public"
    },
    chat: {
      theme: "dark",
      language: "en",
      message_preview: true,
      enter_to_send: true,
      font_size: "medium"
    }
  },
  
  encryption: {
    identity_key: {
      public_key: "BASE64_ENCODED_IDENTITY_KEY",
      key_id: "ik_abc123",
      created_at: ISODate("2024-01-01T00:00:00Z")
    },
    signed_prekey: {
      public_key: "BASE64_ENCODED_SIGNED_PREKEY",
      key_id: "spk_def456",
      signature: "BASE64_ENCODED_SIGNATURE",
      created_at: ISODate("2024-01-01T00:00:00Z")
    },
    registered_at: ISODate("2024-01-01T00:00:00Z"),
    key_version: 1
  },
  
  stats: {
    conversations_count: 15,
    messages_sent: 2500,
    messages_received: 3200,
    files_shared: 45,
    calls_made: 12,
    call_minutes: 180,
    joined_groups: 3
  },
  
  roles: ["user", "vip"],
  permissions: {
    can_create_groups: true,
    can_start_calls: true,
    can_share_files: true,
    max_file_size_mb: 50,
    max_group_members: 100
  },
  
  moderation: {
    is_banned: false,
    ban_reason: null,
    banned_until: null,
    banned_by: null,
    warnings: [],
    reports_against: 0
  },
  
  saas_metadata: {
    tier: "premium",
    subscription_status: "active",
    registered_via: "mobile",
    referrer_id: "ref_campaign_2024",
    tags: ["early_adopter", "beta_tester"]
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T18:45:00Z"),
  deleted_at: null,
  
  __v: 5
}
```

---

## Related Schemas

- [User Devices](user_devices.md) - Registered devices
- [User Sessions](user_sessions.md) - Active sessions
- [User Relationships](user_relationships.md) - Friendships, blocks
- [User Keys](../encryption/user_keys.md) - E2E encryption keys

---

## Validation Rules

1. `user_id` must start with `usr_`
2. `external_id` must be unique within tenant
3. `profile.username` if provided, must be alphanumeric + underscore
4. `profile.bio` max 160 characters
5. `status.state` must be valid status value
6. `settings.privacy.allow_message_requests` must be valid value
7. At least `display_name` required in profile
