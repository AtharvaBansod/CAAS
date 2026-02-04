# MongoDB Service - Query Optimization

> **Parent Roadmap**: [MongoDB Service](../../roadmaps/4_mongodbService.md)

---

## Overview

Query optimization strategies for high-performance MongoDB operations.

---

## 1. Index Strategy

### Compound Index Design
```javascript
// Follow the ESR rule: Equality, Sort, Range

// Good: Equality first, then sort, then range
db.messages.createIndex({ 
  tenant_id: 1,           // Equality
  conversation_id: 1,     // Equality
  created_at: -1          // Sort
});

// Query using this index
db.messages.find({
  tenant_id: ObjectId("..."),
  conversation_id: ObjectId("...")
}).sort({ created_at: -1 }).limit(50);
```

### Covered Queries
```javascript
// Create index that covers query fields
db.users.createIndex({
  tenant_id: 1,
  external_id: 1,
  display_name: 1,
  avatar_url: 1
});

// Query only uses index, no document fetch
db.users.find(
  { tenant_id: tenantId, external_id: { $in: userIds } },
  { _id: 1, display_name: 1, avatar_url: 1 }  // Projection
);
```

---

## 2. Query Patterns

### Pagination with Cursor
```typescript
// DON'T: Skip-based pagination (O(n) for skip)
const page = await db.messages.find(query).skip(1000).limit(50);

// DO: Cursor-based pagination (O(1))
async function getMessages(conversationId: string, cursor?: string, limit = 50) {
  const query: any = { conversation_id: conversationId };
  
  if (cursor) {
    query.created_at = { $lt: new Date(cursor) };
  }
  
  const messages = await db.messages
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit + 1)  // Fetch one extra for hasMore
    .toArray();
  
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  
  return {
    data: messages,
    nextCursor: messages[messages.length - 1]?.created_at.toISOString(),
    hasMore
  };
}
```

### Aggregation Pipeline Optimization
```javascript
// Push $match to beginning
db.messages.aggregate([
  // Filter early to reduce documents processed
  { $match: { tenant_id: tenantId, created_at: { $gte: startDate } } },
  
  // Use index-supported $sort
  { $sort: { created_at: -1 } },
  
  // Limit before expensive operations
  { $limit: 1000 },
  
  // Only then do lookups/projections
  { $lookup: {
    from: 'users',
    localField: 'sender_id',
    foreignField: '_id',
    as: 'sender'
  }},
  
  { $project: { content: 1, sender: { $arrayElemAt: ['$sender', 0] } } }
]);
```

---

## 3. Read Optimization

### Read Preference
```typescript
// Use secondary for analytics queries
const analyticsClient = new MongoClient(uri, {
  readPreference: 'secondaryPreferred',
  readConcern: { level: 'majority' }
});

// Use primary for real-time data
const realtimeClient = new MongoClient(uri, {
  readPreference: 'primary'
});
```

### Projection
```typescript
// DON'T: Fetch entire document
const user = await db.users.findById(userId);

// DO: Fetch only needed fields
const user = await db.users.findById(userId, {
  projection: { display_name: 1, avatar_url: 1, status: 1 }
});
```

---

## 4. Write Optimization

### Bulk Operations
```typescript
// DON'T: Individual inserts
for (const msg of messages) {
  await db.messages.insertOne(msg);
}

// DO: Bulk insert
await db.messages.insertMany(messages, { ordered: false });

// Bulk updates
const bulk = db.messages.initializeUnorderedBulkOp();
for (const update of updates) {
  bulk.find({ _id: update.id }).updateOne({ $set: update.data });
}
await bulk.execute();
```

### Write Concern
```typescript
// High durability for critical data
await db.messages.insertOne(message, {
  writeConcern: { w: 'majority', j: true }
});

// Lower durability for high-volume, non-critical data
await db.analytics.insertOne(event, {
  writeConcern: { w: 1, j: false }
});
```

---

## 5. Explain Analysis

```javascript
// Analyze query performance
const explanation = await db.messages.find({
  tenant_id: tenantId,
  conversation_id: conversationId
}).explain('executionStats');

// Key metrics to check
const stats = explanation.executionStats;
console.log({
  totalDocsExamined: stats.totalDocsExamined,
  totalKeysExamined: stats.totalKeysExamined,
  executionTimeMs: stats.executionTimeMillis,
  indexUsed: explanation.queryPlanner.winningPlan.inputStage.indexName
});

// Healthy query: docsExamined ≈ nReturned
// Unhealthy: docsExamined >> nReturned (collection scan)
```

---

## 6. Performance Targets

| Query Type | Target Latency | Max Docs Examined |
|------------|----------------|-------------------|
| Single doc by ID | < 5ms | 1 |
| List (paginated) | < 50ms | limit + 1 |
| Aggregation (simple) | < 100ms | 10,000 |
| Search | < 200ms | Varies |

---

## Related Documents
- [Caching Strategy](./caching-strategy.md)
- [Message Schema](./message-schema.md)
