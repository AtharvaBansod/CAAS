# R&D: MongoDB Multi-Tenancy Patterns

> **Related Roadmap**: [MongoDB Service](../roadmaps/4_mongodbService.md)

---

## Executive Summary

Analysis of multi-tenancy patterns for MongoDB in the CAAS platform, comparing database-per-tenant, collection-per-tenant, and field-based isolation approaches.

---

## 1. Tenancy Models Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Tenancy Models                            │
├─────────────┬─────────────────┬─────────────────────────────┤
│  Database   │   Collection    │      Shared Collection      │
│ Per Tenant  │   Per Tenant    │    (Field-based Isolation)  │
├─────────────┼─────────────────┼─────────────────────────────┤
│ tenant_a    │ caas_db         │ caas_db                     │
│  ├── users  │  ├── tenant_a   │  ├── users                  │
│  ├── msgs   │  │    ├── users │  │    {tenant_id: 'a', ...} │
│  └── ...    │  │    └── msgs  │  │    {tenant_id: 'b', ...} │
│             │  └── tenant_b   │  └── messages               │
│ tenant_b    │       ├── users │       {tenant_id: 'a', ...} │
│  ├── users  │       └── msgs  │       {tenant_id: 'b', ...} │
│  └── ...    │                 │                             │
└─────────────┴─────────────────┴─────────────────────────────┘
```

---

## 2. Database Per Tenant

### 2.1 Implementation

```typescript
// Connection management
const tenantConnections = new Map<string, mongoose.Connection>();

async function getTenantConnection(tenantId: string): Promise<mongoose.Connection> {
  if (tenantConnections.has(tenantId)) {
    return tenantConnections.get(tenantId)!;
  }
  
  const dbName = `caas_${tenantId}`;
  const connection = await mongoose.createConnection(
    `mongodb://localhost:27017/${dbName}`
  );
  
  tenantConnections.set(tenantId, connection);
  return connection;
}

// Usage
async function getUser(tenantId: string, userId: string) {
  const conn = await getTenantConnection(tenantId);
  const User = conn.model('User', userSchema);
  return User.findById(userId);
}
```

### 2.2 Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Complete data isolation | ❌ Connection overhead |
| ✅ Per-tenant backup/restore | ❌ Complex connection pooling |
| ✅ Independent scaling | ❌ Schema sync across DBs |
| ✅ Easy tenant deletion | ❌ Not suitable for many tenants |
| ✅ Regulatory compliance | ❌ Higher operational cost |

### 2.3 When to Use

- **Enterprise clients** with strict data isolation requirements
- **Regulated industries** (healthcare, finance)
- **< 100 tenants** total
- Tenants with **vastly different scales**

---

## 3. Collection Per Tenant

### 3.1 Implementation

```typescript
// Dynamic collection naming
function getCollectionName(tenantId: string, entity: string): string {
  return `${tenantId}_${entity}`;
}

// Model cache
const modelCache = new Map<string, mongoose.Model<any>>();

function getTenantModel<T>(tenantId: string, entity: string, schema: Schema<T>): Model<T> {
  const collectionName = getCollectionName(tenantId, entity);
  
  if (modelCache.has(collectionName)) {
    return modelCache.get(collectionName)!;
  }
  
  const model = mongoose.model<T>(collectionName, schema, collectionName);
  modelCache.set(collectionName, model);
  return model;
}

// Usage
async function getMessages(tenantId: string, conversationId: string) {
  const Message = getTenantModel(tenantId, 'messages', messageSchema);
  return Message.find({ conversationId });
}
```

### 3.2 Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Logical isolation | ❌ Collection limit (~24k per DB) |
| ✅ Easier ops than DB-per | ❌ Index management complexity |
| ✅ Per-tenant indexes | ❌ Aggregation across tenants hard |
| ✅ Simple tenant deletion | ❌ Schema versioning challenges |

### 3.3 When to Use

- **100-1000 tenants**
- Need **logical isolation** without full DB separation
- When **per-tenant indexes** are beneficial

---

## 4. Shared Collection (Field-Based)

### 4.1 Implementation

```typescript
// Schema with tenant_id
const messageSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  conversation_id: { type: ObjectId, required: true },
  sender_id: { type: ObjectId, required: true },
  content: { type: Object, required: true },
  created_at: { type: Date, default: Date.now }
});

// Compound index for tenant isolation
messageSchema.index({ tenant_id: 1, conversation_id: 1, created_at: -1 });

// Tenant-aware repository
class TenantAwareRepository<T> {
  constructor(
    private model: Model<T>,
    private tenantId: string
  ) {}
  
  async find(query: FilterQuery<T>): Promise<T[]> {
    return this.model.find({
      ...query,
      tenant_id: this.tenantId
    });
  }
  
  async create(doc: Partial<T>): Promise<T> {
    return this.model.create({
      ...doc,
      tenant_id: this.tenantId
    });
  }
  
  // All queries automatically scoped to tenant
}
```

### 4.2 Middleware for Automatic Tenant Filtering

```typescript
// Mongoose middleware
function tenantPlugin(schema: Schema) {
  // Pre-find: add tenant filter
  schema.pre(['find', 'findOne', 'updateMany', 'deleteMany'], function() {
    const tenantId = this.getOptions().tenantId;
    if (tenantId) {
      this.where({ tenant_id: tenantId });
    }
  });
  
  // Pre-save: ensure tenant_id
  schema.pre('save', function() {
    if (!this.tenant_id && this.$__.tenantId) {
      this.tenant_id = this.$__.tenantId;
    }
  });
}

// Usage
const messages = await Message.find({ conversation_id: convId })
  .setOptions({ tenantId: 'tenant-123' });
```

### 4.3 Pros & Cons

| Pros | Cons |
|------|------|
| ✅ Simple operations | ❌ Risk of data leakage |
| ✅ Easy cross-tenant queries | ❌ Every query needs tenant filter |
| ✅ Efficient resource usage | ❌ Large indexes |
| ✅ Scales to many tenants | ❌ Noisy neighbor risk |
| ✅ Single schema version | ❌ Complex tenant deletion |

### 4.4 When to Use

- **1000+ tenants**
- Similar scale across tenants
- Need **cross-tenant analytics**
- Cost-sensitive deployments

---

## 5. Hybrid Approach (Recommended for CAAS)

### 5.1 Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   CAAS Hybrid Tenancy                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │  Premium Tenants │    │  Standard Tenants │              │
│  │  (Database-per)  │    │  (Shared DB)      │              │
│  ├──────────────────┤    ├──────────────────┤              │
│  │ • Enterprise     │    │ • Free tier       │              │
│  │ • Compliance req │    │ • Starter plans   │              │
│  │ • High volume    │    │ • Standard plans  │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                             │
│  Routing:                                                   │
│  ┌─────────────────────────────────────────────┐           │
│  │ if (tenant.tier === 'enterprise')           │           │
│  │   → dedicated database                      │           │
│  │ else if (tenant.volume > 1M msg/day)        │           │
│  │   → dedicated collection set                │           │
│  │ else                                        │           │
│  │   → shared collections                      │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Implementation

```typescript
interface TenantConfig {
  id: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  isolation: 'shared' | 'collection' | 'database';
  dbConnectionString?: string;
}

class TenantRouter {
  async getDataSource(tenantId: string): Promise<DataSource> {
    const tenant = await this.getTenantConfig(tenantId);
    
    switch (tenant.isolation) {
      case 'database':
        return new DedicatedDatabaseSource(tenant.dbConnectionString!);
      
      case 'collection':
        return new DedicatedCollectionSource(tenantId);
      
      case 'shared':
      default:
        return new SharedCollectionSource(tenantId);
    }
  }
}

// Usage is transparent
async function sendMessage(tenantId: string, message: Message) {
  const dataSource = await tenantRouter.getDataSource(tenantId);
  return dataSource.messages.create(message);
}
```

---

## 6. Security Considerations

### 6.1 Data Isolation Verification

```typescript
// Audit query for cross-tenant data leakage
async function auditTenantIsolation(): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  
  // Check for documents without tenant_id
  const orphans = await Message.find({ tenant_id: { $exists: false } });
  if (orphans.length > 0) {
    results.push({
      severity: 'critical',
      issue: 'Documents without tenant_id',
      count: orphans.length
    });
  }
  
  return results;
}
```

### 6.2 Query Validation

```typescript
// Ensure all queries include tenant filtering
const queryValidator = {
  preFind(query: any) {
    if (!query.tenant_id) {
      throw new SecurityError('Query missing tenant_id filter');
    }
  }
};
```

---

## 7. Recommendation for CAAS

### Tier-Based Approach

| Tier | Isolation Model | Rationale |
|------|-----------------|-----------|
| Free | Shared | Cost efficiency |
| Starter | Shared | Good enough isolation |
| Pro | Collection-based | Better performance |
| Enterprise | Database | Compliance, dedicated resources |

### Migration Path

1. Start with **shared collections**
2. Add **collection-based** for high-volume tenants
3. Offer **database isolation** as premium feature

---

## References

- [MongoDB Multi-Tenancy Patterns](https://www.mongodb.com/developer/products/mongodb/multi-tenant-design-patterns/)
- [Mongoose Discriminators](https://mongoosejs.com/docs/discriminators.html)
