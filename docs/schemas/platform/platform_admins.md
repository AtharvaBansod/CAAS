# Platform Admins Schema

> **Collection**: `platform_admins`  
> **Database**: `caas_platform`  
> **Purpose**: Stores admin users who manage SAAS client accounts (client-side admins, not CAAS internal staff)

---

## Overview

Platform admins are users who manage SAAS client accounts. These are **not** end users of the chat system - they are developers, managers, and owners of companies using CAAS.

```
Admin Types:
├── Owner         → Full control, billing access
├── Admin         → User/app management, no billing
├── Developer     → API keys, technical settings
└── Viewer        → Read-only dashboard access
```

---

## Schema Definition

```javascript
// platform_admins collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  admin_id: String,               // Unique ID: "adm_abc123xyz"
  
  // === PROFILE ===
  profile: {
    email: String,                // Login email (unique)
    first_name: String,
    last_name: String,
    display_name: String,         // Computed: "John D."
    avatar_url: String,
    phone: String,
    timezone: String              // "America/Los_Angeles"
  },
  
  // === AUTHENTICATION ===
  auth: {
    // Password (hashed)
    password_hash: String,        // Argon2 hash
    password_updated_at: Date,
    password_expires_at: Date,    // Force password change
    
    // MFA
    mfa_enabled: Boolean,
    mfa_method: String,           // 'totp' | 'sms' | 'email'
    mfa_secret: String,           // Encrypted TOTP secret
    mfa_backup_codes: [String],   // Encrypted backup codes
    mfa_verified_at: Date,
    
    // OAuth connections
    oauth_providers: [{
      provider: String,           // 'google' | 'github' | 'microsoft'
      provider_id: String,
      email: String,
      connected_at: Date
    }],
    
    // Password reset
    reset_token: String,          // Hashed reset token
    reset_token_expires_at: Date,
    
    // Email verification
    email_verified: Boolean,
    email_verification_token: String,
    email_verification_sent_at: Date
  },
  
  // === CLIENT MEMBERSHIPS ===
  // An admin can belong to multiple SAAS clients
  memberships: [{
    client_id: ObjectId,          // Reference to saas_clients._id
    client_name: String,          // Denormalized for quick access
    role: String,                 // 'owner' | 'admin' | 'developer' | 'viewer'
    permissions: [String],        // Override permissions (optional)
    joined_at: Date,
    invited_by: ObjectId,         // Admin who sent invite
    accepted_at: Date,
    status: String                // 'pending' | 'active' | 'suspended'
  }],
  
  // === SESSIONS ===
  sessions: [{
    session_id: String,           // UUID
    device: {
      type: String,               // 'desktop' | 'mobile' | 'tablet'
      browser: String,            // "Chrome 120"
      os: String,                 // "Windows 11"
      ip: String,
      location: String            // "San Francisco, CA"
    },
    created_at: Date,
    last_active_at: Date,
    expires_at: Date,
    is_current: Boolean           // Is this the current session
  }],
  
  // === PREFERENCES ===
  preferences: {
    theme: String,                // 'light' | 'dark' | 'system'
    language: String,             // 'en' | 'es' | 'fr' | ...
    notifications: {
      email_alerts: Boolean,
      sms_alerts: Boolean,
      alert_types: [String]       // ['security', 'billing', 'usage']
    },
    dashboard: {
      default_client_id: ObjectId,  // Default client on login
      sidebar_collapsed: Boolean,
      recent_pages: [String]
    }
  },
  
  // === SECURITY ===
  security: {
    failed_login_attempts: Number,
    locked_until: Date,           // Account lockout
    last_login_at: Date,
    last_login_ip: String,
    suspicious_activity: [{
      type: String,               // 'new_device', 'unusual_location', 'failed_logins'
      detected_at: Date,
      details: Object,
      resolved: Boolean
    }]
  },
  
  // === STATUS ===
  status: String,                 // 'active' | 'suspended' | 'deleted'
  suspended_at: Date,
  suspension_reason: String,
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}
```

---

## Field Descriptions

### Role Permissions

| Role | Capabilities |
|------|--------------|
| `owner` | Full access including billing, can delete account |
| `admin` | Manage apps, users, keys; no billing access |
| `developer` | API keys, webhooks, technical settings only |
| `viewer` | Read-only access to dashboard and analytics |

### Permission Overrides

Custom permissions can override role defaults:

```javascript
permissions: [
  'billing:view',        // Can view billing (normally owner only)
  '!users:delete',       // Cannot delete users (! = deny)
  'apps:*'               // Full app management
]
```

### MFA Methods

| Method | Description |
|--------|-------------|
| `totp` | Time-based OTP (Authenticator apps) |
| `sms` | SMS verification code |
| `email` | Email verification code |

---

## Indexes

```javascript
// Unique indexes
db.platform_admins.createIndex({ "admin_id": 1 }, { unique: true });
db.platform_admins.createIndex({ "profile.email": 1 }, { unique: true });

// Query optimization
db.platform_admins.createIndex({ "memberships.client_id": 1 });
db.platform_admins.createIndex({ "status": 1 });
db.platform_admins.createIndex({ "sessions.session_id": 1 });
db.platform_admins.createIndex({ "auth.oauth_providers.provider": 1, "auth.oauth_providers.provider_id": 1 });
db.platform_admins.createIndex({ "security.last_login_at": -1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439033"),
  admin_id: "adm_johndoe_x9k2",
  
  profile: {
    email: "john.doe@acmepets.com",
    first_name: "John",
    last_name: "Doe",
    display_name: "John D.",
    avatar_url: "https://cdn.caas.io/avatars/adm_johndoe.jpg",
    phone: "+1-555-123-4567",
    timezone: "America/Los_Angeles"
  },
  
  auth: {
    password_hash: "$argon2id$v=19$m=65536,t=3,p=4$...",
    password_updated_at: ISODate("2024-01-01T00:00:00Z"),
    password_expires_at: ISODate("2024-07-01T00:00:00Z"),
    
    mfa_enabled: true,
    mfa_method: "totp",
    mfa_secret: "encrypted_totp_secret",
    mfa_backup_codes: ["enc_code1", "enc_code2", "enc_code3"],
    mfa_verified_at: ISODate("2024-01-01T00:00:00Z"),
    
    oauth_providers: [{
      provider: "google",
      provider_id: "google_user_id_123",
      email: "john.doe@gmail.com",
      connected_at: ISODate("2024-01-01T00:00:00Z")
    }],
    
    reset_token: null,
    reset_token_expires_at: null,
    email_verified: true,
    email_verification_token: null,
    email_verification_sent_at: null
  },
  
  memberships: [
    {
      client_id: ObjectId("507f1f77bcf86cd799439011"),
      client_name: "Acme Pet Social",
      role: "owner",
      permissions: [],
      joined_at: ISODate("2024-01-01T00:00:00Z"),
      invited_by: null,
      accepted_at: ISODate("2024-01-01T00:00:00Z"),
      status: "active"
    },
    {
      client_id: ObjectId("507f1f77bcf86cd799439012"),
      client_name: "Another Client",
      role: "developer",
      permissions: ["billing:view"],
      joined_at: ISODate("2024-01-10T00:00:00Z"),
      invited_by: ObjectId("507f1f77bcf86cd799439034"),
      accepted_at: ISODate("2024-01-10T00:00:00Z"),
      status: "active"
    }
  ],
  
  sessions: [
    {
      session_id: "sess_abc123xyz",
      device: {
        type: "desktop",
        browser: "Chrome 120",
        os: "Windows 11",
        ip: "203.0.113.50",
        location: "San Francisco, CA"
      },
      created_at: ISODate("2024-01-15T08:00:00Z"),
      last_active_at: ISODate("2024-01-15T18:30:00Z"),
      expires_at: ISODate("2024-01-16T08:00:00Z"),
      is_current: true
    }
  ],
  
  preferences: {
    theme: "dark",
    language: "en",
    notifications: {
      email_alerts: true,
      sms_alerts: false,
      alert_types: ["security", "billing"]
    },
    dashboard: {
      default_client_id: ObjectId("507f1f77bcf86cd799439011"),
      sidebar_collapsed: false,
      recent_pages: ["/dashboard", "/apps", "/api-keys"]
    }
  },
  
  security: {
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: ISODate("2024-01-15T08:00:00Z"),
    last_login_ip: "203.0.113.50",
    suspicious_activity: []
  },
  
  status: "active",
  suspended_at: null,
  suspension_reason: null,
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T18:30:00Z"),
  deleted_at: null
}
```

---

## Related Schemas

- [SAAS Clients](saas_clients.md) - Clients this admin manages
- [Audit Logs](../analytics/audit_logs.md) - Admin action history

---

## Validation Rules

1. `admin_id` must start with `adm_`
2. `profile.email` must be valid email format
3. `password_hash` must be valid Argon2 hash
4. At least one membership required (orphan admins not allowed)
5. Each client can have only one `owner`
6. `failed_login_attempts` >= 5 triggers lockout
7. Sessions older than `expires_at` are invalid
