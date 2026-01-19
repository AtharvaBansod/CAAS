# Message Queue Comparison

> Research comparing Kafka, RabbitMQ, and Pulsar for CAAS.

---

## Overview

Selecting the right message queue for event streaming and async processing.

---

## Comparison Table

| Feature | Kafka | RabbitMQ | Pulsar |
|---------|-------|----------|--------|
| **Throughput** | 1M+ msg/sec | 50k msg/sec | 1M+ msg/sec |
| **Latency** | ~5ms | ~1ms | ~5ms |
| **Ordering** | Per-partition | Per-queue | Per-partition |
| **Persistence** | Log-based | Optional | Tiered storage |
| **Replay** | Full replay | Limited | Full replay |
| **Protocol** | Custom binary | AMQP | Custom binary |
| **Multi-tenancy** | Topic namespace | VHost | Native |

---

## Kafka Strengths

1. **High throughput** - Handles millions of messages
2. **Event sourcing** - Full message replay
3. **Stream processing** - Kafka Streams/ksqlDB
4. **Ecosystem** - Connect, Schema Registry
5. **Ordering guarantees** - Per-partition ordering

---

## RabbitMQ Strengths

1. **Low latency** - Sub-millisecond delivery
2. **Flexible routing** - Exchanges, bindings
3. **Message priorities** - Built-in support
4. **Mature** - Battle-tested, stable
5. **Simple operations** - Easy to manage

---

## Pulsar Strengths

1. **Tiered storage** - Automatic offload
2. **Native multi-tenancy** - Built-in isolation
3. **Geo-replication** - Native support
4. **Functions** - Serverless processing
5. **Both queue + stream** - Unified model

---

## CAAS Requirements

| Requirement | Priority | Best Fit |
|-------------|----------|----------|
| High throughput | High | Kafka, Pulsar |
| Message replay | High | Kafka, Pulsar |
| Multi-tenant | High | Pulsar, Kafka |
| Stream processing | Medium | Kafka |
| Operational simplicity | Medium | RabbitMQ |

---

## Recommendation

**Decision: Apache Kafka**

### Reasons:
1. **Chat message volume** - Need high throughput
2. **Event sourcing** - Replay for consistency
3. **Stream processing** - Real-time analytics
4. **Industry standard** - Strong ecosystem
5. **Team expertise** - Common knowledge

### Configuration:
```properties
# Per-tenant topics
chat.messages.{tenant_id}

# Partitioning by conversation_id
# Ensures message ordering per conversation

# Replication factor: 3
# Min ISR: 2
```

---

## Related Documents
- [Kafka Service Roadmap](../roadmaps/8_kafkaService.md)
- [Kafka Topic Architecture](../flowdiagram/kafka-topic-architecture.md)
