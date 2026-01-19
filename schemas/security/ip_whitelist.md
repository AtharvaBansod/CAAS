# IP Whitelist Schema

> **Collection**: `ip_whitelist`  
> **Database**: `caas_platform`  
> **Purpose**: Stores allowed IP addresses for SAAS client API access

---

## Schema Definition

```javascript
// ip_whitelist collection
{
  _id: ObjectId,
  
  // === OWNERSHIP ===
  client_id: ObjectId,                // Reference to saas_clients._id
  app_id: ObjectId,                   // Optional: restrict to specific app
  
  // === IP/CIDR ===
  ip: String,                         // "203.0.113.0" or "203.0.113.0/24"
  type: String,                       // 'ipv4' | 'ipv6' | 'cidr'
  
  // === METADATA ===
  name: String,                       // "Office Network"
  description: String,
  
  // === STATUS ===
  enabled: Boolean,
  
  // === AUDIT ===
  added_by: ObjectId,
  added_at: Date,
  last_used_at: Date,
  use_count: Number,
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  expires_at: Date                    // Temporary whitelist
}
```

---

## Indexes

```javascript
db.ip_whitelist.createIndex({ "client_id": 1, "ip": 1 }, { unique: true });
db.ip_whitelist.createIndex({ "client_id": 1, "enabled": 1 });
db.ip_whitelist.createIndex({ "expires_at": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expires_at: { $exists: true } }
});
```

---

## Related Schemas

- [SAAS Clients](../platform/saas_clients.md) - Owner
- [Blocked IPs](blocked_ips.md) - Blocked IPs
