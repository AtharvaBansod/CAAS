# SAAS Clients Schema

> **Collection**: `saas_clients`  
> **Database**: `caas_platform`  
> **Purpose**: Stores registered SAAS companies (tenants) who integrate CAAS into their applications

---

## Overview

The `saas_clients` collection is the **root entity** of the multi-tenant hierarchy. Each document represents a company/organization that has signed up to use CAAS.

```
SAAS Client (Company)
├── Applications (Products using CAAS)
│   ├── API Keys
│   └── End Users
├── Subscription (Billing)
└── Settings
```

---

## Schema Definition

```javascript
// saas_clients collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  client_id: String,              // Unique readable ID: "clnt_abc123xyz"
  company_name: String,           // "Acme Corporation"
  slug: String,                   // URL-safe: "acme-corporation"
  
  // === CONTACT INFO ===
  contact: {
    primary_email: String,        // Primary contact email
    billing_email: String,        // Billing notifications
    phone: String,                // Optional phone number
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postal_code: String,
      country: String             // ISO 3166-1 alpha-2
    }
  },
  
  // === ACCOUNT STATUS ===
  status: String,                 // 'pending' | 'active' | 'suspended' | 'cancelled'
  verification: {
    email_verified: Boolean,
    domain_verified: Boolean,     // DNS TXT record verified
    verified_at: Date
  },
  
  // === SUBSCRIPTION REFERENCE ===
  subscription_id: ObjectId,      // Reference to billing.subscriptions
  tier: String,                   // 'free' | 'starter' | 'pro' | 'enterprise'
  
  // === ISOLATION CONFIG ===
  isolation: {
    model: String,                // 'shared' | 'collection' | 'database'
    database_name: String,        // For dedicated DB: "caas_clnt_abc123"
    region: String                // Primary data region: "us-east-1"
  },
  
  // === LIMITS & QUOTAS ===
  quotas: {
    max_applications: Number,     // -1 for unlimited
    max_users: Number,
    max_messages_per_month: Number,
    max_storage_gb: Number,
    max_api_calls_per_month: Number
  },
  current_usage: {
    applications_count: Number,
    users_count: Number,
    messages_this_month: Number,
    storage_used_gb: Number,
    api_calls_this_month: Number,
    last_calculated_at: Date
  },
  
  // === FEATURES ===
  features: {
    voice_calls: Boolean,
    video_calls: Boolean,
    screen_sharing: Boolean,
    file_sharing: Boolean,
    e2e_encryption: Boolean,
    custom_branding: Boolean,
    sso_enabled: Boolean,
    webhooks_enabled: Boolean,
    analytics_enabled: Boolean
  },
  
  // === SECURITY ===
  security: {
    mfa_required: Boolean,        // Require MFA for admin access
    ip_whitelist_enabled: Boolean,
    allowed_domains: [String],    // Allowed email domains
    session_timeout_minutes: Number
  },
  
  // === METADATA ===
  metadata: {
    industry: String,             // 'healthcare' | 'finance' | 'education' | 'other'
    company_size: String,         // 'startup' | 'smb' | 'enterprise'
    referral_source: String,      // How they found CAAS
    notes: String                 // Internal notes
  },
  
  // === ADMIN USERS ===
  admins: [{
    user_id: ObjectId,            // Reference to platform_admins
    role: String,                 // 'owner' | 'admin' | 'developer' | 'viewer'
    added_at: Date,
    added_by: ObjectId
  }],
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  activated_at: Date,             // When went from pending to active
  suspended_at: Date,
  cancelled_at: Date
}
```

---

## Field Descriptions

### Identification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client_id` | String | Yes | Unique public identifier with prefix `clnt_` |
| `company_name` | String | Yes | Legal company name |
| `slug` | String | Yes | URL-safe unique identifier |

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Registered but email not verified |
| `active` | Fully operational account |
| `suspended` | Temporarily disabled (payment issues, policy violation) |
| `cancelled` | Permanently closed account |

### Tier Values

| Tier | Isolation | Features |
|------|-----------|----------|
| `free` | Shared | Basic chat only |
| `starter` | Shared | + Voice calls |
| `pro` | Collection-based | + Video, screen share |
| `enterprise` | Dedicated database | All features + SLA |

---

## Indexes

```javascript
// Unique indexes
db.saas_clients.createIndex({ "client_id": 1 }, { unique: true });
db.saas_clients.createIndex({ "slug": 1 }, { unique: true });
db.saas_clients.createIndex({ "contact.primary_email": 1 }, { unique: true });

// Query optimization
db.saas_clients.createIndex({ "status": 1 });
db.saas_clients.createIndex({ "tier": 1 });
db.saas_clients.createIndex({ "created_at": -1 });
db.saas_clients.createIndex({ "admins.user_id": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  client_id: "clnt_acme_2024_x7k9",
  company_name: "Acme Pet Social",
  slug: "acme-pet-social",
  
  contact: {
    primary_email: "admin@acmepets.com",
    billing_email: "billing@acmepets.com",
    phone: "+1-555-123-4567",
    address: {
      line1: "123 Main Street",
      line2: "Suite 400",
      city: "San Francisco",
      state: "CA",
      postal_code: "94102",
      country: "US"
    }
  },
  
  status: "active",
  verification: {
    email_verified: true,
    domain_verified: true,
    verified_at: ISODate("2024-01-10T10:00:00Z")
  },
  
  subscription_id: ObjectId("507f1f77bcf86cd799439022"),
  tier: "pro",
  
  isolation: {
    model: "collection",
    database_name: null,
    region: "us-west-2"
  },
  
  quotas: {
    max_applications: 5,
    max_users: 10000,
    max_messages_per_month: 500000,
    max_storage_gb: 50,
    max_api_calls_per_month: 1000000
  },
  current_usage: {
    applications_count: 2,
    users_count: 3500,
    messages_this_month: 125000,
    storage_used_gb: 12.5,
    api_calls_this_month: 450000,
    last_calculated_at: ISODate("2024-01-15T00:00:00Z")
  },
  
  features: {
    voice_calls: true,
    video_calls: true,
    screen_sharing: true,
    file_sharing: true,
    e2e_encryption: true,
    custom_branding: false,
    sso_enabled: false,
    webhooks_enabled: true,
    analytics_enabled: true
  },
  
  security: {
    mfa_required: true,
    ip_whitelist_enabled: false,
    allowed_domains: ["acmepets.com"],
    session_timeout_minutes: 480
  },
  
  metadata: {
    industry: "other",
    company_size: "startup",
    referral_source: "google_search",
    notes: "Pet social media platform - high growth potential"
  },
  
  admins: [{
    user_id: ObjectId("507f1f77bcf86cd799439033"),
    role: "owner",
    added_at: ISODate("2024-01-01T00:00:00Z"),
    added_by: null
  }],
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T12:00:00Z"),
  activated_at: ISODate("2024-01-10T10:00:00Z"),
  suspended_at: null,
  cancelled_at: null
}
```

---

## Related Schemas

- [Applications](applications.md) - Applications owned by this client
- [API Keys](api_keys.md) - Keys issued to this client
- [Subscriptions](../billing/subscriptions.md) - Billing subscription
- [Platform Admins](platform_admins.md) - Admin users

---

## Validation Rules

1. `client_id` must start with `clnt_`
2. `contact.primary_email` must be valid email format
3. `status` transitions:
   - `pending` → `active` (after verification)
   - `active` → `suspended` (payment/policy)
   - `suspended` → `active` (issue resolved)
   - `active`/`suspended` → `cancelled` (final)
4. At least one admin with `role: 'owner'` required
