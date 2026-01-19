# Kafka Topic Architecture

> Topic structure and partitioning strategy for CAAS event streaming.

---

## Topic Hierarchy

```
caas-kafka/
├── chat/
│   ├── chat.messages.{tenant_id}    # Per-tenant message streams
│   ├── chat.events                   # Global chat events
│   └── chat.dlq                      # Dead letter queue
│
├── presence/
│   └── presence.updates              # User status changes
│
├── notifications/
│   ├── notifications.pending         # Outbound notifications
│   └── notifications.push            # Push notification triggers
│
├── analytics/
│   ├── analytics.events              # User activity events
│   └── analytics.metrics             # Aggregated metrics
│
├── audit/
│   └── audit.log                     # Security audit trail
│
└── internal/
    ├── internal.commands             # Service commands
    └── internal.sync                 # Data sync events
```

---

## Topic Configuration

| Topic Pattern | Partitions | Retention | Replication |
|---------------|------------|-----------|-------------|
| chat.messages.* | 32 | 30 days | 3 |
| presence.updates | 16 | 1 day | 3 |
| notifications.* | 8 | 7 days | 3 |
| analytics.events | 24 | 90 days | 3 |
| audit.log | 12 | 365 days | 3 |

---

## Partitioning Strategy

```typescript
// Message topic: partition by conversation_id
key = conversation_id
// Ensures message ordering within conversation

// Presence topic: partition by user_id
key = user_id
// All updates for user on same partition

// Analytics: partition by tenant_id
key = tenant_id
// Enables per-tenant processing
```

---

## Message Schema (Avro)

```json
{
  "type": "record",
  "name": "ChatMessage",
  "namespace": "io.caas.events",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "type", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "timestamp", "type": "long"},
    {"name": "payload", "type": "bytes"}
  ]
}
```

---

## Related Documents
- [Consumer Pipeline](./consumer-pipeline.md)
- [Kafka Cluster Config](../deepDive/kafkaService/cluster-configuration.md)
