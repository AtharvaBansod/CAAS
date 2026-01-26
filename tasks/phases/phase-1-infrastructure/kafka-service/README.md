# Kafka Service Tasks

> **Phase**: 1 - Core Infrastructure  
> **Priority**: Critical  
> **Estimated Hours**: 60

---

## 📋 Overview

The Kafka Service provides distributed event streaming for reliable message delivery, event sourcing, and async microservice communication.

---

## 📁 Task Files

| File | Description | Est. Hours |
|------|-------------|------------|
| [01-cluster-setup.json](01-cluster-setup.json) | Kafka cluster deployment and configuration | 20 |
| [02-topics.json](02-topics.json) | Topic architecture and schema registry | 20 |
| [03-producers-consumers.json](03-producers-consumers.json) | Producer/consumer patterns implementation | 20 |

---

## 🔗 Dependencies

### Required Before Starting
- Docker and Docker Compose
- MongoDB service operational

### Required By
- Socket service (message persistence)
- Analytics service (event pipeline)
- Notification service (event delivery)

---

## 🏗️ Service Structure

```
services/kafka-service/
├── src/
│   ├── config/
│   │   ├── kafka.config.ts
│   │   ├── topics.config.ts
│   │   └── index.ts
│   ├── client/
│   │   ├── kafka-client.ts
│   │   ├── admin-client.ts
│   │   └── health-check.ts
│   ├── producers/
│   │   ├── base.producer.ts
│   │   ├── message.producer.ts
│   │   ├── event.producer.ts
│   │   └── index.ts
│   ├── consumers/
│   │   ├── base.consumer.ts
│   │   ├── message.consumer.ts
│   │   ├── analytics.consumer.ts
│   │   └── index.ts
│   ├── schemas/
│   │   ├── message.schema.ts
│   │   ├── event.schema.ts
│   │   └── registry.ts
│   └── index.ts
├── tests/
├── Dockerfile
└── package.json
```

---

## 📊 Topic Architecture

```
Topics:
├── chat.messages.{tenant_id}    # Per-tenant message topics (partitioned by conversation)
├── chat.events                   # Chat events (reactions, read receipts, typing)
├── presence.updates              # User presence changes
├── notifications.pending         # Notification delivery queue
├── analytics.events              # Analytics event stream
├── audit.log                     # Security audit trail
└── internal.commands             # Internal service commands
```

---

## ✅ Completion Criteria

- [ ] Kafka cluster running with 3 brokers
- [ ] All topics created with correct configuration
- [ ] Schema registry operational
- [ ] Producers sending messages reliably
- [ ] Consumers processing with correct ordering
- [ ] Dead letter queue for failed messages
- [ ] Monitoring metrics exposed
- [ ] Integration tests passing

---

*Last Updated: 2026-01-26*
