# User Keys Schema

> **Collection**: `user_keys`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores E2E encryption keys for Signal Protocol implementation

---

## Overview

Implements Signal Protocol key management:
- Identity keys (long-term)
- Signed prekeys (medium-term)
- One-time prekeys (single use)

---

## Schema Definition

```javascript
// user_keys collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === OWNERSHIP ===
  user_id: ObjectId,                  // Reference to users._id
  
  // === IDENTITY KEY ===
  // Long-term key pair, changes rarely
  identity_key: {
    key_id: String,                   // "ik_abc123"
    public_key: String,               // Base64 encoded Ed25519 public key
    fingerprint: String,              // Human-readable fingerprint for verification
    created_at: Date,
    version: Number
  },
  
  // === SIGNED PREKEY ===
  // Medium-term, rotated periodically (e.g., weekly)
  signed_prekey: {
    key_id: Number,                   // Incrementing ID
    public_key: String,               // Base64 encoded X25519 public key
    signature: String,                // Signature by identity key
    created_at: Date,
    expires_at: Date,
    version: Number
  },
  
  // === REGISTRATION ===
  registration: {
    registration_id: Number,          // Random 14-bit number
    registered_at: Date
  },
  
  // === KEY STATUS ===
  status: {
    active: Boolean,
    last_key_rotation_at: Date,
    rotation_required: Boolean,
    prekey_count: Number,             // Available one-time prekeys
    prekey_low_warning: Boolean
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.user_keys.createIndex({ "tenant_id": 1, "user_id": 1 }, { unique: true });
db.user_keys.createIndex({ "identity_key.key_id": 1 });
db.user_keys.createIndex({ "identity_key.fingerprint": 1 });
db.user_keys.createIndex({ "status.prekey_low_warning": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440700"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: ObjectId("507f1f77bcf86cd799440001"),
  
  identity_key: {
    key_id: "ik_johndoe_v1",
    public_key: "BASE64_ED25519_PUBLIC_KEY",
    fingerprint: "12345 67890 12345 67890 12345 67890",
    created_at: ISODate("2024-01-01T00:00:00Z"),
    version: 1
  },
  
  signed_prekey: {
    key_id: 1,
    public_key: "BASE64_X25519_PUBLIC_KEY",
    signature: "BASE64_SIGNATURE",
    created_at: ISODate("2024-01-15T00:00:00Z"),
    expires_at: ISODate("2024-01-22T00:00:00Z"),
    version: 5
  },
  
  registration: {
    registration_id: 12345,
    registered_at: ISODate("2024-01-01T00:00:00Z")
  },
  
  status: {
    active: true,
    last_key_rotation_at: ISODate("2024-01-15T00:00:00Z"),
    rotation_required: false,
    prekey_count: 85,
    prekey_low_warning: false
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T00:00:00Z")
}
```

---

## Related Schemas

- [Users](../users/users.md) - Key owner
- [Prekey Bundles](prekey_bundles.md) - One-time prekeys
