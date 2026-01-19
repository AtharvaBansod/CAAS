# Blocked IPs Schema

> **Collection**: `blocked_ips`  
> **Database**: `caas_platform`  
> **Purpose**: Stores blocked IP addresses for threat prevention

---

## Schema Definition

```javascript
// blocked_ips collection
{
  _id: ObjectId,
  
  // === SCOPE ===
  scope: String,                      // 'global' | 'tenant'
  tenant_id: String,                  // null for global blocks
  
  // === IP/CIDR ===
  ip: String,                         // IP or CIDR range
  type: String,                       // 'ipv4' | 'ipv6' | 'cidr'
  
  // === METADATA ===
  reason: String,                     // 'brute_force' | 'spam' | 'abuse' | 'manual'
  description: String,
  
  // === BLOCK DETAILS ===
  block_type: String,                 // 'temporary' | 'permanent'
  blocked_at: Date,
  blocked_until: Date,                // null for permanent
  
  // === SOURCE ===
  blocked_by: {
    type: String,                     // 'system' | 'admin' | 'threat_intel'
    id: ObjectId,                     // Admin ID if manual
    rule_id: String                   // Automation rule ID
  },
  
  // === STATS ===
  stats: {
    attempts_blocked: Number,
    last_attempt_at: Date
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.blocked_ips.createIndex({ "ip": 1, "scope": 1, "tenant_id": 1 }, { unique: true });
db.blocked_ips.createIndex({ "scope": 1, "blocked_until": 1 });
db.blocked_ips.createIndex({ "tenant_id": 1 });
db.blocked_ips.createIndex({ "blocked_until": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { blocked_until: { $exists: true } }
});
```

---

## Related Schemas

- [IP Whitelist](ip_whitelist.md) - Allowed IPs
