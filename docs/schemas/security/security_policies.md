# Security Policies Schema

> **Collection**: `security_policies`  
> **Database**: `caas_platform`  
> **Purpose**: Stores configurable security policy definitions

---

## Schema Definition

```javascript
// security_policies collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  policy_id: String,                  // "pol_brute_force_v1"
  
  // === SCOPE ===
  scope: String,                      // 'global' | 'tenant'
  tenant_id: String,                  // null for global
  
  // === POLICY TYPE ===
  type: String,                       // 'rate_limit' | 'authentication' | 'access' | 'content'
  name: String,                       // "Brute Force Protection"
  description: String,
  
  // === RULES ===
  rules: [{
    rule_id: String,
    condition: {
      metric: String,                 // 'failed_logins' | 'requests_per_minute'
      operator: String,               // 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
      threshold: Number,
      window_seconds: Number
    },
    action: {
      type: String,                   // 'block' | 'captcha' | 'notify' | 'rate_limit'
      duration_seconds: Number,
      notify: [String]                // ['admin', 'user']
    },
    enabled: Boolean
  }],
  
  // === STATUS ===
  status: String,                     // 'active' | 'disabled' | 'testing'
  
  // === METADATA ===
  metadata: {
    version: Number,
    created_by: ObjectId,
    last_modified_by: ObjectId,
    notes: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Policy Types

| Type | Description |
|------|-------------|
| `rate_limit` | Request throttling |
| `authentication` | Login security |
| `access` | Permission/access rules |
| `content` | Content filtering |

---

## Indexes

```javascript
db.security_policies.createIndex({ "policy_id": 1 }, { unique: true });
db.security_policies.createIndex({ "scope": 1, "tenant_id": 1, "type": 1 });
db.security_policies.createIndex({ "status": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799441200"),
  policy_id: "pol_brute_force_v2",
  
  scope: "global",
  tenant_id: null,
  
  type: "authentication",
  name: "Brute Force Protection",
  description: "Block IPs after repeated failed login attempts",
  
  rules: [
    {
      rule_id: "rule_soft_block",
      condition: {
        metric: "failed_logins",
        operator: "gte",
        threshold: 5,
        window_seconds: 300
      },
      action: {
        type: "captcha",
        duration_seconds: 3600,
        notify: []
      },
      enabled: true
    },
    {
      rule_id: "rule_hard_block",
      condition: {
        metric: "failed_logins",
        operator: "gte",
        threshold: 10,
        window_seconds: 300
      },
      action: {
        type: "block",
        duration_seconds: 86400,
        notify: ["admin"]
      },
      enabled: true
    }
  ],
  
  status: "active",
  
  metadata: {
    version: 2,
    created_by: ObjectId("507f1f77bcf86cd799439000"),
    last_modified_by: ObjectId("507f1f77bcf86cd799439000"),
    notes: "Updated thresholds based on production data"
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T00:00:00Z")
}
```

---

## Related Schemas

- [Blocked IPs](blocked_ips.md) - Enforced blocks
- [Audit Logs](../analytics/audit_logs.md) - Policy actions logged
