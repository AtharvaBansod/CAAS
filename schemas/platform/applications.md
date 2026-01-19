# Applications Schema

> **Collection**: `applications`  
> **Database**: `caas_platform`  
> **Purpose**: Stores individual applications/products created by SAAS clients that integrate CAAS

---

## Overview

Each SAAS client can create multiple **applications**. An application represents a distinct product or environment (e.g., "Production App", "Staging App", "Mobile App").

```
SAAS Client
├── Application: "Pet Social - Production"
│   ├── API Keys (Production)
│   └── End Users (Live customers)
├── Application: "Pet Social - Staging"
│   ├── API Keys (Staging)
│   └── End Users (Test accounts)
└── Application: "Pet Social - Mobile"
    └── ...
```

---

## Schema Definition

```javascript
// applications collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  app_id: String,                 // Unique readable ID: "app_xyz789abc"
  client_id: ObjectId,            // Reference to saas_clients._id
  tenant_id: String,              // Same as parent client's client_id
  
  name: String,                   // "Pet Social Production"
  description: String,            // Optional description
  
  // === ENVIRONMENT ===
  environment: String,            // 'development' | 'staging' | 'production'
  
  // === STATUS ===
  status: String,                 // 'active' | 'disabled' | 'deleted'
  
  // === CONFIGURATION ===
  config: {
    // Allowed origins for CORS
    allowed_origins: [String],    // ["https://app.acmepets.com", "https://m.acmepets.com"]
    
    // Webhook configuration
    webhooks: {
      enabled: Boolean,
      url: String,                // Webhook endpoint
      secret: String,             // Webhook signing secret (encrypted)
      events: [String]            // ['message.sent', 'user.joined', ...]
    },
    
    // Feature overrides (inherits from client, can restrict further)
    features: {
      voice_calls: Boolean,
      video_calls: Boolean,
      screen_sharing: Boolean,
      file_sharing: Boolean,
      max_file_size_mb: Number,
      allowed_file_types: [String]  // ['image/*', 'application/pdf']
    },
    
    // Rate limits specific to this app
    rate_limits: {
      messages_per_minute: Number,
      api_calls_per_minute: Number,
      connections_per_user: Number
    },
    
    // UI customization
    branding: {
      primary_color: String,      // "#6366f1"
      logo_url: String,
      favicon_url: String,
      custom_css_url: String
    }
  },
  
  // === SECURITY ===
  security: {
    // IP restrictions (additional to client-level)
    ip_whitelist: [String],       // Allowed IPs/CIDR ranges
    
    // Token configuration
    jwt_config: {
      issuer: String,             // Custom issuer claim
      audience: String,           // Custom audience claim
      token_expiry_minutes: Number,
      refresh_token_expiry_days: Number
    },
    
    // Content security
    content_moderation: {
      enabled: Boolean,
      block_profanity: Boolean,
      custom_blocked_words: [String]
    }
  },
  
  // === STATISTICS (Cached) ===
  stats: {
    total_users: Number,
    active_users_today: Number,
    active_users_month: Number,
    messages_today: Number,
    messages_month: Number,
    last_updated_at: Date
  },
  
  // === API KEYS REFERENCE ===
  api_keys: [{
    key_id: ObjectId,             // Reference to api_keys._id
    name: String,                 // "Production Key"
    type: String,                 // 'server' | 'client'
    created_at: Date
  }],
  
  // === METADATA ===
  metadata: {
    platform: String,             // 'web' | 'mobile' | 'desktop' | 'all'
    version: String,              // App version tracking
    notes: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  disabled_at: Date,
  deleted_at: Date                // Soft delete
}
```

---

## Field Descriptions

### Environment Values

| Environment | Purpose |
|-------------|---------|
| `development` | Local development, relaxed security |
| `staging` | Pre-production testing |
| `production` | Live customer-facing |

### Status Values

| Status | Description |
|--------|-------------|
| `active` | Fully operational |
| `disabled` | Temporarily turned off (API returns 503) |
| `deleted` | Soft deleted, pending permanent removal |

### Webhook Events

| Event | Trigger |
|-------|---------|
| `message.sent` | New message in any conversation |
| `message.read` | Message marked as read |
| `user.joined` | New user registered |
| `user.status_changed` | User online/offline |
| `conversation.created` | New conversation started |
| `file.uploaded` | File shared |
| `call.started` | Voice/video call initiated |
| `call.ended` | Call terminated |

---

## Indexes

```javascript
// Unique indexes
db.applications.createIndex({ "app_id": 1 }, { unique: true });
db.applications.createIndex({ "client_id": 1, "name": 1 }, { unique: true });

// Query optimization
db.applications.createIndex({ "client_id": 1 });
db.applications.createIndex({ "tenant_id": 1 });
db.applications.createIndex({ "status": 1 });
db.applications.createIndex({ "environment": 1 });
db.applications.createIndex({ "created_at": -1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439044"),
  app_id: "app_petsocial_prod_k8m2",
  client_id: ObjectId("507f1f77bcf86cd799439011"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  name: "Pet Social Production",
  description: "Main production application for Pet Social platform",
  
  environment: "production",
  status: "active",
  
  config: {
    allowed_origins: [
      "https://petsocial.com",
      "https://www.petsocial.com",
      "https://app.petsocial.com"
    ],
    
    webhooks: {
      enabled: true,
      url: "https://api.petsocial.com/webhooks/caas",
      secret: "encrypted_webhook_secret_here",
      events: ["message.sent", "user.joined", "file.uploaded"]
    },
    
    features: {
      voice_calls: true,
      video_calls: true,
      screen_sharing: false,
      file_sharing: true,
      max_file_size_mb: 25,
      allowed_file_types: ["image/*", "video/*", "application/pdf"]
    },
    
    rate_limits: {
      messages_per_minute: 60,
      api_calls_per_minute: 1000,
      connections_per_user: 5
    },
    
    branding: {
      primary_color: "#FF6B35",
      logo_url: "https://cdn.petsocial.com/logo.png",
      favicon_url: "https://cdn.petsocial.com/favicon.ico",
      custom_css_url: null
    }
  },
  
  security: {
    ip_whitelist: [],
    
    jwt_config: {
      issuer: "petsocial.com",
      audience: "caas-api",
      token_expiry_minutes: 60,
      refresh_token_expiry_days: 30
    },
    
    content_moderation: {
      enabled: true,
      block_profanity: true,
      custom_blocked_words: ["spam", "scam"]
    }
  },
  
  stats: {
    total_users: 3500,
    active_users_today: 850,
    active_users_month: 2800,
    messages_today: 15000,
    messages_month: 125000,
    last_updated_at: ISODate("2024-01-15T12:00:00Z")
  },
  
  api_keys: [
    {
      key_id: ObjectId("507f1f77bcf86cd799439055"),
      name: "Backend Server Key",
      type: "server",
      created_at: ISODate("2024-01-01T00:00:00Z")
    },
    {
      key_id: ObjectId("507f1f77bcf86cd799439056"),
      name: "Frontend Client Key",
      type: "client",
      created_at: ISODate("2024-01-01T00:00:00Z")
    }
  ],
  
  metadata: {
    platform: "all",
    version: "2.5.0",
    notes: "Main production app - handle with care"
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T12:00:00Z"),
  disabled_at: null,
  deleted_at: null
}
```

---

## Related Schemas

- [SAAS Clients](saas_clients.md) - Parent client
- [API Keys](api_keys.md) - Keys for this application
- [Users](../saas/users/users.md) - End users of this application

---

## Validation Rules

1. `app_id` must start with `app_`
2. `client_id` must reference existing SAAS client
3. `environment` must be one of: `development`, `staging`, `production`
4. `allowed_origins` must be valid URLs (production should be HTTPS)
5. Maximum applications per client enforced by `saas_clients.quotas.max_applications`
6. `rate_limits` values must be positive integers
