# User Devices Schema

> **Collection**: `user_devices`  
> **Database**: Tenant-scoped  
> **Purpose**: Tracks registered devices for multi-device support and E2E encryption

---

## Overview

Each user can connect from multiple devices (phone, tablet, desktop). This collection tracks each device for:
- Multi-device message sync
- E2E encryption key management per device
- Push notification delivery
- Security (device-based session management)

---

## Schema Definition

```javascript
// user_devices collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === OWNERSHIP ===
  user_id: ObjectId,                  // Reference to users._id
  
  // === DEVICE IDENTIFICATION ===
  device_id: String,                  // Unique: "dev_iphone_x9k2"
  
  device_info: {
    name: String,                     // "John's iPhone 15"
    type: String,                     // 'mobile' | 'tablet' | 'desktop' | 'web'
    platform: String,                 // 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web'
    os_version: String,               // "iOS 17.2"
    app_version: String,              // "2.5.0"
    model: String,                    // "iPhone 15 Pro"
    manufacturer: String,             // "Apple"
    
    // Browser info (for web)
    browser: String,                  // "Chrome 120"
    browser_version: String,
    
    // Device fingerprint (for fraud detection)
    fingerprint: String               // Hashed device fingerprint
  },
  
  // === PUSH NOTIFICATIONS ===
  push_notification: {
    enabled: Boolean,
    token: String,                    // FCM/APNs token
    provider: String,                 // 'fcm' | 'apns' | 'web_push'
    endpoint: String,                 // Web Push endpoint URL
    keys: {                           // Web Push keys
      p256dh: String,
      auth: String
    },
    last_refreshed_at: Date,
    failed_attempts: Number,
    last_failure_reason: String
  },
  
  // === E2E ENCRYPTION ===
  encryption: {
    // Device-specific keys for Signal protocol
    identity_key_id: String,          // Reference to user's identity key
    
    // Prekey bundle for this device
    signed_prekey: {
      key_id: Number,
      public_key: String,             // Base64 encoded
      signature: String,
      created_at: Date,
      expires_at: Date
    },
    
    // One-time prekeys (replenished as used)
    one_time_prekeys: [{
      key_id: Number,
      public_key: String,
      created_at: Date,
      used: Boolean,
      used_at: Date
    }],
    
    // Prekey replenishment
    prekey_count: Number,             // Available prekeys
    prekey_low_threshold: Number,     // Trigger replenishment at this count
    last_prekey_upload_at: Date
  },
  
  // === SESSION ===
  session: {
    session_id: String,               // Current session ID
    connected: Boolean,
    socket_id: String,                // Current socket connection ID
    server_id: String,                // Which socket server
    connected_at: Date,
    disconnected_at: Date,
    connection_count: Number          // Times connected today
  },
  
  // === ACTIVITY ===
  activity: {
    last_active_at: Date,
    first_seen_at: Date,
    total_sessions: Number,
    total_messages_sent: Number,
    
    // Geographic info
    last_ip: String,
    last_location: {
      city: String,
      region: String,
      country: String,
      timezone: String
    }
  },
  
  // === STATUS ===
  status: String,                     // 'active' | 'trusted' | 'revoked'
  trusted: Boolean,                   // User has verified this device
  trusted_at: Date,
  
  // === SECURITY ===
  security: {
    is_suspicious: Boolean,
    suspicious_reason: String,        // 'new_location', 'bot_pattern', etc.
    verification_required: Boolean,
    
    // Rate limiting
    rate_limit_exceeded: Boolean,
    blocked_until: Date
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  revoked_at: Date
}
```

---

## Field Descriptions

### Device Types

| Type | Description |
|------|-------------|
| `mobile` | Smartphones |
| `tablet` | Tablets, iPads |
| `desktop` | Desktop applications |
| `web` | Browser-based access |

### Platform Values

| Platform | Description |
|----------|-------------|
| `ios` | Apple iPhone/iPad |
| `android` | Android devices |
| `windows` | Windows desktop |
| `macos` | macOS desktop |
| `linux` | Linux desktop |
| `web` | Web browser |

### Status Values

| Status | Description |
|--------|-------------|
| `active` | Normal operation |
| `trusted` | User explicitly trusted this device |
| `revoked` | Device access removed |

---

## Indexes

```javascript
// Unique indexes
db.user_devices.createIndex({ "tenant_id": 1, "device_id": 1 }, { unique: true });

// Query optimization
db.user_devices.createIndex({ "tenant_id": 1, "user_id": 1 });
db.user_devices.createIndex({ "tenant_id": 1, "user_id": 1, "status": 1 });
db.user_devices.createIndex({ "push_notification.token": 1 });
db.user_devices.createIndex({ "session.socket_id": 1 });

// Cleanup indexes
db.user_devices.createIndex({ "activity.last_active_at": 1 });
db.user_devices.createIndex({ "revoked_at": 1 }, { 
  expireAfterSeconds: 2592000  // TTL: 30 days after revocation
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440010"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: ObjectId("507f1f77bcf86cd799440001"),
  
  device_id: "dev_iphone15_x9k2",
  
  device_info: {
    name: "John's iPhone",
    type: "mobile",
    platform: "ios",
    os_version: "iOS 17.2",
    app_version: "2.5.0",
    model: "iPhone 15 Pro",
    manufacturer: "Apple",
    browser: null,
    browser_version: null,
    fingerprint: "fp_abc123def456"
  },
  
  push_notification: {
    enabled: true,
    token: "fcm_token_abc123xyz...",
    provider: "apns",
    endpoint: null,
    keys: null,
    last_refreshed_at: ISODate("2024-01-15T00:00:00Z"),
    failed_attempts: 0,
    last_failure_reason: null
  },
  
  encryption: {
    identity_key_id: "ik_abc123",
    
    signed_prekey: {
      key_id: 1,
      public_key: "BASE64_SIGNED_PREKEY",
      signature: "BASE64_SIGNATURE",
      created_at: ISODate("2024-01-01T00:00:00Z"),
      expires_at: ISODate("2024-02-01T00:00:00Z")
    },
    
    one_time_prekeys: [
      { key_id: 100, public_key: "BASE64_OPK_1", created_at: ISODate("2024-01-01T00:00:00Z"), used: false, used_at: null },
      { key_id: 101, public_key: "BASE64_OPK_2", created_at: ISODate("2024-01-01T00:00:00Z"), used: true, used_at: ISODate("2024-01-10T00:00:00Z") }
      // ... more prekeys
    ],
    
    prekey_count: 85,
    prekey_low_threshold: 20,
    last_prekey_upload_at: ISODate("2024-01-01T00:00:00Z")
  },
  
  session: {
    session_id: "sess_mobile_abc123",
    connected: true,
    socket_id: "socket_xyz789",
    server_id: "socket-server-3",
    connected_at: ISODate("2024-01-15T08:00:00Z"),
    disconnected_at: null,
    connection_count: 5
  },
  
  activity: {
    last_active_at: ISODate("2024-01-15T18:45:00Z"),
    first_seen_at: ISODate("2024-01-01T00:00:00Z"),
    total_sessions: 150,
    total_messages_sent: 2500,
    
    last_ip: "203.0.113.50",
    last_location: {
      city: "San Francisco",
      region: "California",
      country: "US",
      timezone: "America/Los_Angeles"
    }
  },
  
  status: "trusted",
  trusted: true,
  trusted_at: ISODate("2024-01-01T00:00:00Z"),
  
  security: {
    is_suspicious: false,
    suspicious_reason: null,
    verification_required: false,
    rate_limit_exceeded: false,
    blocked_until: null
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T18:45:00Z"),
  revoked_at: null
}
```

---

## Related Schemas

- [Users](users.md) - Owner user
- [User Sessions](user_sessions.md) - Session details
- [Prekey Bundles](../encryption/prekey_bundles.md) - E2E encryption prekeys

---

## Validation Rules

1. `device_id` must start with `dev_`
2. `device_info.type` must be valid device type
3. `device_info.platform` must be valid platform
4. `push_notification.provider` must be valid provider
5. User can have maximum 10 active devices
6. `one_time_prekeys` should maintain at least `prekey_low_threshold` unused keys
