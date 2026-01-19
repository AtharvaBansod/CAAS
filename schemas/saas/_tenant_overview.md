# SAAS Tenant Collections Overview

> **Database**: `caas_shared` (Free/Starter) or `caas_{tenant_id}` (Enterprise)  
> **Purpose**: Per-tenant data collections for end-user chat functionality

---

## Overview

These collections store the core chat data for each SAAS tenant's end users. All collections are **tenant-scoped** using the `tenant_id` field.

---

## Collection Hierarchy

```
Tenant (SAAS Client)
├── users/
│   ├── users              → End user profiles
│   ├── user_devices       → Registered devices
│   ├── user_sessions      → Active sessions
│   └── user_relationships → Friendships, blocks
│
├── messaging/
│   ├── conversations      → Chat threads (1:1, group, channel)
│   ├── messages           → Individual messages
│   ├── reactions          → Message reactions
│   └── read_receipts      → Read status tracking
│
├── media/
│   ├── files              → Uploaded files metadata
│   ├── posts              → Public posts/reels/stories
│   └── media_metadata     → Processing metadata
│
├── groups/
│   ├── groups             → Group definitions
│   └── group_members      → Membership details
│
├── encryption/
│   ├── user_keys          → E2E encryption keys
│   └── prekey_bundles     → Signal protocol prekeys
│
└── settings/
    └── tenant_settings    → Tenant-specific configuration
```

---

## Tenant Isolation

### Shared Collections (Free/Starter)

All queries MUST include `tenant_id`:

```javascript
// ✅ Correct - Always filter by tenant
db.users.find({ tenant_id: "clnt_abc123", status: "active" });

// ❌ WRONG - Data leakage risk!
db.users.find({ status: "active" });
```

### Dedicated Collections (Pro)

Collections are prefixed with tenant ID:

```
clnt_abc123_users
clnt_abc123_messages
clnt_abc123_conversations
```

### Dedicated Database (Enterprise)

Separate database per tenant:

```
Database: caas_clnt_abc123
├── users
├── messages
├── conversations
└── ...
```

---

## Common Patterns

### Tenant-Aware Base Schema

All tenant collections extend this base:

```javascript
{
  _id: ObjectId,
  tenant_id: String,                  // Always indexed
  created_at: Date,
  updated_at: Date,
  deleted_at: Date | null,            // Soft delete
  __v: Number                         // Version for optimistic locking
}
```

### User Reference Pattern

When referencing users:

```javascript
{
  user_id: ObjectId,                  // Reference to users._id
  user_external_id: String,           // External ID (denormalized)
  user_display_name: String           // Display name (denormalized, refresh periodically)
}
```

### Pagination Pattern

For list endpoints:

```javascript
// Cursor-based pagination
{
  cursor: ObjectId,                   // Last seen _id
  limit: Number,                      // Items per page (default 20, max 100)
  direction: 'forward' | 'backward'
}

// Query
db.messages.find({ 
  tenant_id: "clnt_abc123",
  conversation_id: convId,
  _id: { $lt: cursor }
}).sort({ _id: -1 }).limit(limit);
```

---

## Quick Links

| Domain | Purpose | Link |
|--------|---------|------|
| **Users** | End user management | [View Schemas](users/) |
| **Messaging** | Conversations & messages | [View Schemas](messaging/) |
| **Media** | Files & posts | [View Schemas](media/) |
| **Groups** | Group management | [View Schemas](groups/) |
| **Encryption** | E2E keys | [View Schemas](encryption/) |
| **Settings** | Configuration | [View Schemas](settings/) |

---

## Performance Considerations

1. **Index `tenant_id` first** in all compound indexes
2. **Shard by `tenant_id`** for horizontal scaling
3. **Archive old messages** to cold storage after 1 year
4. **Use TTL indexes** for ephemeral data (typing indicators, presence)
