# API Keys Schema

> **Collection**: `api_keys`  
> **Database**: `caas_platform`  
> **Purpose**: Stores API keys used by SAAS clients to authenticate requests to CAAS

---

## Overview

API keys are the primary authentication mechanism for server-to-server communication between SAAS applications and CAAS.

### Key Types

| Type | Use Case | Permissions |
|------|----------|-------------|
| `server` | Backend services | Full API access |
| `client` | Frontend/SDK | Limited, user-scoped |
| `webhook` | Webhook signatures | Verify only |

### Security Model

```
API Key Structure:
┌──────────────────────────────────────────────────────────────┐
│  caas_sk_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0     │
│  └──┬─┘└┬┘└─┬─┘└────────────────────┬────────────────────┘   │
│    │   │   │                        │                        │
│  Prefix Type Env          Random Secret (32 bytes)           │
└──────────────────────────────────────────────────────────────┘

- Prefix: "caas" (identifies our platform)
- Type: "sk" (secret key) or "pk" (public key)
- Env: "live" or "test"
- Secret: Cryptographically random, never stored in plain text
```

---

## Schema Definition

```javascript
// api_keys collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  key_id: String,                 // Public ID: "key_abc123xyz"
  
  // === OWNERSHIP ===
  client_id: ObjectId,            // Reference to saas_clients._id
  app_id: ObjectId,               // Reference to applications._id (optional)
  tenant_id: String,              // Parent client's client_id
  
  // === KEY DATA ===
  name: String,                   // Human-readable name: "Production Server Key"
  type: String,                   // 'server' | 'client' | 'webhook'
  
  // Key prefix (first 8 chars) - for identification in logs
  key_prefix: String,             // "caas_sk_l" (shown in UI)
  
  // Hashed key - bcrypt or argon2
  key_hash: String,               // "$argon2id$v=19$..."
  
  // === ENVIRONMENT ===
  environment: String,            // 'test' | 'live'
  
  // === STATUS ===
  status: String,                 // 'active' | 'revoked' | 'expired'
  
  // === PERMISSIONS ===
  permissions: {
    // Scope restrictions
    scopes: [String],             // ['chat:read', 'chat:write', 'users:read', ...]
    
    // Resource restrictions
    allowed_endpoints: [String],  // ['/messages/*', '/users/*'] or ['*']
    
    // Rate limit overrides
    rate_limit: {
      requests_per_minute: Number,
      requests_per_day: Number
    }
  },
  
  // === RESTRICTIONS ===
  restrictions: {
    // IP restrictions
    ip_whitelist: [String],       // Allowed IPs/CIDR
    
    // Expiration
    expires_at: Date,             // null for no expiration
    
    // Usage limits
    max_requests: Number,         // Total lifetime requests (-1 for unlimited)
    requests_used: Number         // Counter
  },
  
  // === ROTATION ===
  rotation: {
    // Primary/Secondary key support
    is_primary: Boolean,          // Primary key for this app
    predecessor_id: ObjectId,     // Previous key (for rotation tracking)
    
    // Auto-rotation settings
    auto_rotate: Boolean,
    rotate_after_days: Number,
    last_rotated_at: Date,
    next_rotation_at: Date
  },
  
  // === AUDIT ===
  audit: {
    created_by: ObjectId,         // Admin who created
    revoked_by: ObjectId,         // Admin who revoked
    revoked_at: Date,
    revocation_reason: String,
    
    // Last usage tracking
    last_used_at: Date,
    last_used_ip: String,
    last_used_endpoint: String,
    
    // Usage statistics
    total_requests: Number,
    failed_requests: Number,
    last_failure_at: Date,
    last_failure_reason: String
  },
  
  // === METADATA ===
  metadata: {
    description: String,
    tags: [String],               // ['production', 'backend', 'critical']
    notes: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Field Descriptions

### Key Type Permissions

| Type | Scopes | Use Case |
|------|--------|----------|
| `server` | All scopes | Backend API calls, user management |
| `client` | `chat:*`, `presence:*` | Frontend SDK, user-authenticated actions |
| `webhook` | None (verify only) | Webhook signature verification |

### Available Scopes

```javascript
// User Management
'users:read'          // List/get users
'users:write'         // Create/update users
'users:delete'        // Delete users

// Chat
'chat:read'           // Read messages, conversations
'chat:write'          // Send messages, create conversations
'chat:delete'         // Delete messages

// Presence
'presence:read'       // View online status
'presence:write'      // Update own status

// Files
'files:read'          // View/download files
'files:write'         // Upload files
'files:delete'        // Delete files

// Calls
'calls:read'          // View call history
'calls:write'         // Initiate calls

// Admin
'admin:read'          // View settings
'admin:write'         // Modify settings
```

### Status Values

| Status | Description |
|--------|-------------|
| `active` | Key is valid and can be used |
| `revoked` | Manually disabled, cannot be reactivated |
| `expired` | Past expiration date |

---

## Indexes

```javascript
// Unique indexes
db.api_keys.createIndex({ "key_id": 1 }, { unique: true });
db.api_keys.createIndex({ "key_prefix": 1 });  // Not unique, for lookup

// Query optimization
db.api_keys.createIndex({ "client_id": 1 });
db.api_keys.createIndex({ "app_id": 1 });
db.api_keys.createIndex({ "tenant_id": 1 });
db.api_keys.createIndex({ "status": 1 });
db.api_keys.createIndex({ "type": 1 });
db.api_keys.createIndex({ "restrictions.expires_at": 1 });
db.api_keys.createIndex({ "audit.last_used_at": -1 });

// Compound for active key lookup
db.api_keys.createIndex({ "app_id": 1, "status": 1, "type": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439055"),
  key_id: "key_petsocial_srv_m9n2",
  
  client_id: ObjectId("507f1f77bcf86cd799439011"),
  app_id: ObjectId("507f1f77bcf86cd799439044"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  name: "Production Backend Server",
  type: "server",
  
  key_prefix: "caas_sk_l",
  key_hash: "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hashedkeyvalue",
  
  environment: "live",
  status: "active",
  
  permissions: {
    scopes: ["users:read", "users:write", "chat:read", "chat:write", "files:read", "files:write"],
    allowed_endpoints: ["*"],
    rate_limit: {
      requests_per_minute: 1000,
      requests_per_day: 100000
    }
  },
  
  restrictions: {
    ip_whitelist: ["203.0.113.0/24", "198.51.100.10"],
    expires_at: null,
    max_requests: -1,
    requests_used: 0
  },
  
  rotation: {
    is_primary: true,
    predecessor_id: null,
    auto_rotate: true,
    rotate_after_days: 90,
    last_rotated_at: ISODate("2024-01-01T00:00:00Z"),
    next_rotation_at: ISODate("2024-04-01T00:00:00Z")
  },
  
  audit: {
    created_by: ObjectId("507f1f77bcf86cd799439033"),
    revoked_by: null,
    revoked_at: null,
    revocation_reason: null,
    
    last_used_at: ISODate("2024-01-15T18:30:00Z"),
    last_used_ip: "203.0.113.50",
    last_used_endpoint: "/api/v1/messages",
    
    total_requests: 452890,
    failed_requests: 23,
    last_failure_at: ISODate("2024-01-14T10:00:00Z"),
    last_failure_reason: "Rate limit exceeded"
  },
  
  metadata: {
    description: "Main backend server key for production API calls",
    tags: ["production", "backend", "critical"],
    notes: "Contact DevOps before rotating"
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T18:30:00Z")
}
```

---

## Related Schemas

- [SAAS Clients](saas_clients.md) - Owner client
- [Applications](applications.md) - Linked application

---

## Security Notes

1. **Never store plain-text keys** - Only store hashed version
2. **Key shown once** - Display full key only at creation time
3. **Prefix for identification** - Use prefix to identify keys in logs without exposing secret
4. **IP whitelisting** - Strongly recommended for server keys
5. **Rotation policy** - Implement automatic rotation for security
6. **Audit everything** - Log all key usage for security monitoring

---

## Validation Rules

1. `key_id` must start with `key_`
2. `key_hash` must be valid Argon2/bcrypt hash
3. `type` must be one of: `server`, `client`, `webhook`
4. `environment` must match parent application's environment
5. `scopes` must be valid scope strings from defined list
6. `ip_whitelist` entries must be valid IP addresses or CIDR ranges
