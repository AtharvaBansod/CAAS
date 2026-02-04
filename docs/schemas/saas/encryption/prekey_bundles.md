# Prekey Bundles Schema

> **Collection**: `prekey_bundles`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores one-time prekeys for Signal Protocol (each used once then deleted)

---

## Overview

One-time prekeys enable secure key exchange even when the recipient is offline. Each prekey is used once and then deleted.

---

## Schema Definition

```javascript
// prekey_bundles collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === OWNERSHIP ===
  user_id: ObjectId,                  // Reference to users._id
  device_id: ObjectId,                // Reference to user_devices._id
  
  // === PREKEY ===
  key_id: Number,                     // Incrementing key ID
  public_key: String,                 // Base64 encoded X25519 public key
  
  // === STATUS ===
  used: Boolean,                      // Has this key been consumed
  used_at: Date,
  used_by_user_id: ObjectId,          // Who used this prekey
  
  // === TIMESTAMPS ===
  created_at: Date,
  expires_at: Date                    // Auto-expire unused keys after X days
}
```

---

## Indexes

```javascript
// Find available prekey for user/device
db.prekey_bundles.createIndex(
  { "tenant_id": 1, "user_id": 1, "device_id": 1, "used": 1, "key_id": 1 }
);

// Unique key per user
db.prekey_bundles.createIndex(
  { "tenant_id": 1, "user_id": 1, "key_id": 1 }, 
  { unique: true }
);

// Cleanup used/expired keys
db.prekey_bundles.createIndex({ "expires_at": 1 }, { 
  expireAfterSeconds: 0 
});

db.prekey_bundles.createIndex({ "used_at": 1 }, {
  partialFilterExpression: { used: true }
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440710"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: ObjectId("507f1f77bcf86cd799440001"),
  device_id: ObjectId("507f1f77bcf86cd799440010"),
  
  key_id: 100,
  public_key: "BASE64_X25519_ONE_TIME_PREKEY",
  
  used: false,
  used_at: null,
  used_by_user_id: null,
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  expires_at: ISODate("2024-04-01T00:00:00Z")
}
```

---

## Related Schemas

- [User Keys](user_keys.md) - Main encryption keys
- [User Devices](../users/user_devices.md) - Device-specific keys
