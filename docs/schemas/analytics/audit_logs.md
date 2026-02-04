# Audit Logs Schema

> **Collection**: `audit_logs`  
> **Database**: `caas_analytics`  
> **Purpose**: Security audit trail for compliance and forensics

---

## Overview

Audit logs capture security-relevant events for compliance (SOC 2, GDPR, etc.).

---

## Schema Definition

```javascript
// audit_logs collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  audit_id: String,                   // "aud_abc123xyz"
  
  // === CONTEXT ===
  tenant_id: String,                  // Affected tenant (null for platform events)
  
  // === ACTOR ===
  actor: {
    type: String,                     // 'platform_admin' | 'client_admin' | 'user' | 'system' | 'api'
    id: ObjectId,                     // Actor document ID
    email: String,
    ip: String,
    user_agent: String
  },
  
  // === ACTION ===
  action: {
    category: String,                 // 'auth' | 'data' | 'config' | 'security' | 'billing'
    type: String,                     // 'login' | 'create' | 'update' | 'delete' | 'export'
    name: String                      // Full action: 'user.created', 'api_key.rotated'
  },
  
  // === TARGET ===
  target: {
    type: String,                     // 'user' | 'api_key' | 'subscription' | 'settings'
    id: ObjectId,
    identifier: String                // Human-readable: "user_johndoe@example.com"
  },
  
  // === CHANGES ===
  changes: {
    before: Object,                   // Previous state (sensitive fields redacted)
    after: Object,                    // New state
    fields_changed: [String]          // ['email', 'role']
  },
  
  // === RESULT ===
  result: {
    status: String,                   // 'success' | 'failure' | 'error'
    error_message: String,
    error_code: String
  },
  
  // === METADATA ===
  metadata: {
    request_id: String,               // Correlation ID
    session_id: String,
    reason: String,                   // User-provided reason
    compliance_flags: [String]        // ['gdpr', 'data_export']
  },
  
  // === TIMESTAMP ===
  timestamp: Date,
  
  // === RETENTION ===
  retention: {
    expires_at: Date,                 // Based on retention policy
    legal_hold: Boolean               // Prevent deletion
  }
}
```

---

## Action Categories

| Category | Examples |
|----------|----------|
| `auth` | login, logout, mfa_enabled, password_changed |
| `data` | user_created, message_deleted, data_exported |
| `config` | settings_updated, api_key_created, webhook_configured |
| `security` | ip_blocked, suspicious_activity, key_rotated |
| `billing` | subscription_changed, payment_failed, invoice_generated |

---

## Indexes

```javascript
db.audit_logs.createIndex({ "audit_id": 1 }, { unique: true });
db.audit_logs.createIndex({ "tenant_id": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "actor.id": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "action.name": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "target.id": 1, "timestamp": -1 });
db.audit_logs.createIndex({ "metadata.request_id": 1 });

// Retention TTL (only if not under legal hold)
db.audit_logs.createIndex({ "retention.expires_at": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { "retention.legal_hold": false }
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799441100"),
  audit_id: "aud_apikey_rotate_x9k2",
  
  tenant_id: "clnt_acme_2024_x7k9",
  
  actor: {
    type: "client_admin",
    id: ObjectId("507f1f77bcf86cd799439033"),
    email: "john.doe@acmepets.com",
    ip: "203.0.113.50",
    user_agent: "Mozilla/5.0..."
  },
  
  action: {
    category: "security",
    type: "update",
    name: "api_key.rotated"
  },
  
  target: {
    type: "api_key",
    id: ObjectId("507f1f77bcf86cd799439055"),
    identifier: "key_petsocial_srv_m9n2"
  },
  
  changes: {
    before: { key_prefix: "caas_sk_l (old)" },
    after: { key_prefix: "caas_sk_l (new)" },
    fields_changed: ["key_hash", "rotation.last_rotated_at"]
  },
  
  result: {
    status: "success",
    error_message: null,
    error_code: null
  },
  
  metadata: {
    request_id: "req_abc123xyz",
    session_id: "sess_mobile_abc123xyz",
    reason: "Quarterly key rotation",
    compliance_flags: []
  },
  
  timestamp: ISODate("2024-01-15T18:00:00Z"),
  
  retention: {
    expires_at: ISODate("2025-01-15T18:00:00Z"),
    legal_hold: false
  }
}
```

---

## Related Schemas

- [Platform Admins](../platform/platform_admins.md) - Actor admins
- [API Keys](../platform/api_keys.md) - Audited keys
