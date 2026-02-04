# User Sessions Schema

> **Collection**: `user_sessions`  
> **Database**: Tenant-scoped  
> **Purpose**: Tracks active authentication sessions for end users

---

## Overview

Sessions represent authenticated access periods. A user may have multiple concurrent sessions across devices.

---

## Schema Definition

```javascript
// user_sessions collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === OWNERSHIP ===
  user_id: ObjectId,                  // Reference to users._id
  device_id: ObjectId,                // Reference to user_devices._id
  
  // === SESSION IDENTIFICATION ===
  session_id: String,                 // Unique: "sess_abc123xyz"
  
  // === TOKENS ===
  tokens: {
    // Access token (short-lived)
    access_token_hash: String,        // Hashed JWT
    access_token_expires_at: Date,
    
    // Refresh token (long-lived)
    refresh_token_hash: String,       // Hashed refresh token
    refresh_token_expires_at: Date,
    
    // Token refresh tracking
    refresh_count: Number,            // Times refreshed
    last_refresh_at: Date
  },
  
  // === STATUS ===
  status: String,                     // 'active' | 'expired' | 'revoked'
  
  // === ACTIVITY ===
  activity: {
    created_at: Date,                 // Session start
    last_active_at: Date,             // Last API call
    expires_at: Date,                 // Absolute expiration
    
    // IP tracking
    created_ip: String,
    last_ip: String,
    ip_history: [{
      ip: String,
      seen_at: Date
    }],
    
    // Location
    location: {
      city: String,
      region: String,
      country: String
    }
  },
  
  // === SECURITY ===
  security: {
    is_suspicious: Boolean,
    suspicious_indicators: [String],  // ['ip_change', 'unusual_time', ...]
    requires_reauthentication: Boolean,
    mfa_verified: Boolean,
    mfa_verified_at: Date
  },
  
  // === TERMINATION ===
  terminated: {
    at: Date,
    by: String,                       // 'user' | 'admin' | 'system' | 'security'
    reason: String,                   // 'logout', 'password_change', 'suspicious_activity'
    from_ip: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.user_sessions.createIndex({ "tenant_id": 1, "session_id": 1 }, { unique: true });
db.user_sessions.createIndex({ "tenant_id": 1, "user_id": 1, "status": 1 });
db.user_sessions.createIndex({ "tokens.access_token_hash": 1 });
db.user_sessions.createIndex({ "tokens.refresh_token_hash": 1 });
db.user_sessions.createIndex({ "activity.expires_at": 1 }, { 
  expireAfterSeconds: 0  // TTL at exact time
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440020"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  user_id: ObjectId("507f1f77bcf86cd799440001"),
  device_id: ObjectId("507f1f77bcf86cd799440010"),
  
  session_id: "sess_mobile_abc123xyz",
  
  tokens: {
    access_token_hash: "$sha256$access_token_hash...",
    access_token_expires_at: ISODate("2024-01-15T19:45:00Z"),
    
    refresh_token_hash: "$sha256$refresh_token_hash...",
    refresh_token_expires_at: ISODate("2024-02-14T18:45:00Z"),
    
    refresh_count: 12,
    last_refresh_at: ISODate("2024-01-15T18:45:00Z")
  },
  
  status: "active",
  
  activity: {
    created_at: ISODate("2024-01-01T08:00:00Z"),
    last_active_at: ISODate("2024-01-15T18:45:00Z"),
    expires_at: ISODate("2024-02-14T18:45:00Z"),
    
    created_ip: "203.0.113.50",
    last_ip: "203.0.113.50",
    ip_history: [
      { ip: "203.0.113.50", seen_at: ISODate("2024-01-01T08:00:00Z") }
    ],
    
    location: {
      city: "San Francisco",
      region: "California",
      country: "US"
    }
  },
  
  security: {
    is_suspicious: false,
    suspicious_indicators: [],
    requires_reauthentication: false,
    mfa_verified: true,
    mfa_verified_at: ISODate("2024-01-01T08:00:00Z")
  },
  
  terminated: null,
  
  created_at: ISODate("2024-01-01T08:00:00Z"),
  updated_at: ISODate("2024-01-15T18:45:00Z")
}
```

---

## Related Schemas

- [Users](users.md) - Session owner
- [User Devices](user_devices.md) - Associated device
