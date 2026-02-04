# CAAS Database Schema Documentation

> **Master Index** - Complete schema reference for all MongoDB collections in the CAAS platform

---

## 📁 Schema Organization

The schemas are organized into logical domains reflecting the multi-tenant architecture:

```
schemas/
├── platform/          # CAAS Platform-level (internal operations)
├── saas/              # Per-SAAS Client (tenant) data
│   ├── users/         # End user management
│   ├── messaging/     # Conversations & messages
│   ├── media/         # Files, posts, reels
│   ├── groups/        # Group chat management
│   ├── encryption/    # E2E encryption keys
│   └── settings/      # Client configuration
├── billing/           # Subscriptions, invoices, usage
├── analytics/         # Events, metrics, audit logs
└── security/          # IP lists, policies
```

---

## 🏗️ Database Architecture

### Multi-Tenancy Model: Collection-per-Tenant (Hybrid)

Based on our R&D analysis ([MongoDB Multi-Tenancy](../rnd/mongodb-multi-tenancy.md)), we use a **Hybrid Approach**:

| Tier | Isolation Model | Collections |
|------|-----------------|-------------|
| Free/Starter | Shared Collections | `tenant_id` field prefix |
| Pro | Collection Sets | `{tenant_id}_users`, `{tenant_id}_messages` |
| Enterprise | Dedicated Database | Separate MongoDB database |

### Database Naming Convention

```
caas_platform           # Platform-level collections
caas_billing            # Billing & subscription data
caas_analytics          # Analytics & metrics (time-series)
caas_shared             # Shared tenant data (Free/Starter)
caas_{tenant_id}        # Dedicated tenant database (Enterprise)
```

---

## 📊 Collection Categories

### 1. Platform Collections
> Internal CAAS operations - NOT tenant-scoped

| Collection | Purpose | Doc Link |
|------------|---------|----------|
| `saas_clients` | Registered SAAS companies | [View](platform/saas_clients.md) |
| `applications` | Client applications | [View](platform/applications.md) |
| `api_keys` | API key management | [View](platform/api_keys.md) |
| `platform_admins` | CAAS internal admins | [View](platform/platform_admins.md) |

### 2. SAAS Tenant Collections
> Per-tenant data - Always includes `tenant_id`

| Domain | Collections | Doc Links |
|--------|-------------|-----------|
| **Users** | `users`, `user_devices`, `user_sessions`, `user_relationships` | [View](saas/users/) |
| **Messaging** | `conversations`, `messages`, `reactions`, `read_receipts` | [View](saas/messaging/) |
| **Media** | `files`, `posts`, `media_metadata` | [View](saas/media/) |
| **Groups** | `groups`, `group_members` | [View](saas/groups/) |
| **Encryption** | `user_keys`, `prekey_bundles` | [View](saas/encryption/) |
| **Settings** | `tenant_settings` | [View](saas/settings/) |

### 3. Billing Collections
> Subscription and payment management

| Collection | Purpose | Doc Link |
|------------|---------|----------|
| `subscriptions` | Active subscriptions | [View](billing/subscriptions.md) |
| `plans` | Pricing plans | [View](billing/plans.md) |
| `invoices` | Generated invoices | [View](billing/invoices.md) |
| `usage_records` | Metered usage | [View](billing/usage_records.md) |
| `payment_methods` | Stored payment info | [View](billing/payment_methods.md) |

### 4. Analytics Collections
> Monitoring, metrics, and audit

| Collection | Purpose | Doc Link |
|------------|---------|----------|
| `events` | Activity events | [View](analytics/events.md) |
| `metrics` | Aggregated metrics | [View](analytics/metrics.md) |
| `audit_logs` | Security audit trail | [View](analytics/audit_logs.md) |

### 5. Security Collections
> Access control and threat prevention

| Collection | Purpose | Doc Link |
|------------|---------|----------|
| `ip_whitelist` | Allowed IPs | [View](security/ip_whitelist.md) |
| `blocked_ips` | Blocked IPs | [View](security/blocked_ips.md) |
| `security_policies` | Policy definitions | [View](security/security_policies.md) |

---

## 🔑 Common Field Conventions

### Standard Fields (All Collections)

```javascript
{
  _id: ObjectId,              // MongoDB auto-generated
  created_at: Date,           // Document creation timestamp
  updated_at: Date,           // Last modification timestamp
  __v: Number                 // Version key (for optimistic locking)
}
```

### Tenant-Scoped Fields

```javascript
{
  tenant_id: String,          // SAAS client identifier (indexed)
  // ... collection-specific fields
}
```

### Soft Delete Pattern

```javascript
{
  deleted_at: Date | null,    // null = active, Date = soft deleted
  deleted_by: ObjectId | null // Who deleted (for audit)
}
```

---

## 📐 Index Strategy

### Primary Indexes (Always Applied)

1. **Tenant Isolation**: `{ tenant_id: 1 }` on all tenant collections
2. **Time-based Queries**: `{ created_at: -1 }` on high-volume collections
3. **Compound Indexes**: `{ tenant_id: 1, <primary_lookup_field>: 1 }`

### Performance Indexes

See individual collection documentation for specific index recommendations.

---

## 🔄 Schema Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-15 | Initial schema design |

---

## 📚 Related Resources

- [MongoDB Service Roadmap](../roadmaps/4_mongodbService.md)
- [Multi-Tenancy R&D](../rnd/mongodb-multi-tenancy.md)
- [Priority Roadmap - Phase 1](../docs/PRIORITY_ROADMAP.md)
