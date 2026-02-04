# Kafka Service - Cluster Configuration

> **Parent Roadmap**: [Kafka Service](../../roadmaps/8_kafkaService.md)

---

## Overview

Production-ready Kafka cluster setup with high availability, security, and monitoring.

---

## 1. Cluster Architecture

### Topology
```
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │Broker 1 │     │Broker 2 │     │Broker 3 │
   │ (KRaft) │     │ (KRaft) │     │ (KRaft) │
   └────┬────┘     └────┬────┘     └────┬────┘
        │               │               │
   ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
   │SSD Data │     │SSD Data │     │SSD Data │
   └─────────┘     └─────────┘     └─────────┘
```

### Hardware Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| Memory | 8 GB | 32+ GB |
| Storage | 100 GB SSD | 500 GB+ NVMe |

---

## 2. Docker Development Setup

```yaml
# docker-compose.kafka.yml
version: '3.8'
services:
  kafka-1:
    image: confluentinc/cp-kafka:7.5.0
    ports: ["9092:9092"]
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:29093,2@kafka-2:29093,3@kafka-3:29093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    volumes:
      - kafka-1-data:/var/lib/kafka/data

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    ports: ["8081:8081"]
    environment:
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka-1:29092

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    ports: ["8080:8080"]
```

---

## 3. Security Configuration

### SASL/SCRAM + SSL
```properties
# server.properties
security.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
ssl.keystore.location=/etc/kafka/ssl/kafka.keystore.jks
ssl.truststore.location=/etc/kafka/ssl/kafka.truststore.jks
```

### ACL Configuration
```bash
kafka-acls.sh --add --allow-principal User:app-user \
  --operation Read --operation Write \
  --topic 'chat.messages.*'
```

---

## 4. Production Settings

```properties
# Replication
default.replication.factor=3
min.insync.replicas=2

# Performance
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400

# Retention
log.retention.hours=168
log.segment.bytes=1073741824
```

---

## 5. Monitoring

### Key Metrics
| Metric | Alert Threshold |
|--------|-----------------|
| UnderReplicatedPartitions | > 0 |
| ActiveControllerCount | ≠ 1 |
| MaxLag | > 10000 |

---

## Related Documents
- [Message Schema Design](./message-schema.md)
- [Producer Patterns](./producer-patterns.md)
