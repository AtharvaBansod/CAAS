# Kafka Service

> **CAAS Platform - Event Streaming Service**  
> Kafka service layer with topic management, producer/consumer patterns, and event streaming

---

## 📋 Overview

The Kafka Service provides a robust event streaming foundation for the CAAS platform with built-in support for:
- ✅ Multi-broker Kafka cluster with high availability
- ✅ Topic management with tenant isolation
- ✅ Schema registry integration
- ✅ Producer/consumer patterns with error handling
- ✅ Partition strategies for message ordering
- ✅ Health monitoring and metrics
- ✅ Dead letter queues and retry mechanisms

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Kafka cluster running (see [Docker Setup](#docker-setup))
- Schema Registry running
- TypeScript knowledge

### Installation

```bash
cd services/kafka-service
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your Kafka configuration:
```env
KAFKA_BROKERS=kafka-1:29092,kafka-2:29092,kafka-3:29092
SCHEMA_REGISTRY_URL=http://schema-registry:8081
```

### Run

```bash
# Development mode with hot reload
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test
```

---

## 🐳 Docker Setup

The Kafka cluster is already configured in the main Docker Compose setup:

```bash
# Navigate to local directory
cd ../../local

# Start the full infrastructure (includes Kafka)
docker-compose up -d

# Check Kafka cluster status
docker-compose ps | grep kafka

# View Kafka logs
docker-compose logs kafka-1

# Initialize topics (if needed)
docker exec -it caas-kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

### Kafka UI Access

- **Kafka UI**: http://localhost:8080
- **Schema Registry**: http://localhost:8081

---

## 📚 Usage Examples

### Basic Service Initialization

```typescript
import { getKafkaService } from '@caas/kafka-service';

async function main() {
  const kafkaService = getKafkaService();
  
  try {
    // Initialize service (connects to Kafka and creates topics)
    await kafkaService.initialize();
    
    // Service is ready to use
    console.log('Kafka service is ready!');
    
    // Get health status
    const health = await kafkaService.getHealth();
    console.log('Health:', health);
    
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

main();
```

### Topic Management

```typescript
import { getTopicManager } from '@caas/kafka-service';

const topicManager = getTopicManager();

// Create tenant topics
await topicManager.createTenantTopics('tenant-123');

// List all topics
const topics = await topicManager.listTopics();
console.log('Topics:', topics);

// Get topic health
const health = await topicManager.getTopicHealth();
console.log('Topic health:', health);

// Delete tenant topics (cleanup)
await topicManager.deleteTenantTopics('tenant-123');
```

### Partition Strategy

```typescript
import { PartitionStrategy } from '@caas/kafka-service';

// Calculate partition key for message ordering
const key = PartitionStrategy.createMessageKey('conversation_id', {
  tenantId: 'tenant-123',
  conversationId: 'conv-456',
  userId: 'user-789',
});

console.log('Partition key:', key); // 'conv-456'

// Get recommended partition count
const partitions = PartitionStrategy.getRecommendedPartitions('conversation_id', {
  messagesPerSecond: 1000,
  uniqueKeys: 500,
  consumers: 3,
});

console.log('Recommended partitions:', partitions);
```

### Health Monitoring

```typescript
import { createHealthCheck } from '@caas/kafka-service';

const healthCheck = createHealthCheck();

// Comprehensive health check
const health = await healthCheck.check();
console.log('Healthy:', health.healthy);
console.log('Latency:', health.latency, 'ms');
console.log('Brokers:', health.details.cluster?.brokers);

// Check individual brokers
const brokerHealth = await healthCheck.checkBrokers();
brokerHealth.forEach(broker => {
  console.log(`Broker ${broker.nodeId}: ${broker.healthy ? '✅' : '❌'}`);
});

// Simple ping test
const ping = await healthCheck.ping();
console.log('Ping successful:', ping.success);
```

---

## 🏗️ Architecture

### Topic Architecture

```
Platform Topics:
├── platform.events          # Platform-wide events (8 partitions)
├── platform.audit           # Audit logs (8 partitions, 365 days retention)
└── platform.notifications   # Admin notifications (4 partitions)

Tenant Topics (per tenant):
├── chat.messages.{tenant_id}    # Chat messages (16 partitions, conversation ordering)
├── chat.events.{tenant_id}      # Reactions, typing, read receipts (8 partitions)
├── presence.{tenant_id}         # User presence (4 partitions, compacted)
├── analytics.{tenant_id}        # Analytics events (8 partitions, 90 days)
└── notifications.{tenant_id}    # User notifications (4 partitions)

Internal Topics:
├── internal.dlq              # Dead letter queue (4 partitions)
├── internal.retry            # Retry queue (4 partitions)
├── internal.retry.1min       # 1-minute delay retry
├── internal.retry.5min       # 5-minute delay retry
└── internal.retry.30min      # 30-minute delay retry
```

### Partition Strategies

| Strategy | Use Case | Key | Ordering |
|----------|----------|-----|----------|
| `conversation_id` | Chat messages | Conversation ID | Per conversation |
| `user_id` | User events | User ID | Per user |
| `tenant_id` | Platform events | Tenant ID | Per tenant |
| `random` | Analytics | Random | No ordering |

### Configuration Matrix

| Topic Pattern | Partitions | Retention | Compaction | Strategy |
|---------------|------------|-----------|------------|----------|
| `chat.messages.*` | 16 | 30 days | No | conversation_id |
| `chat.events.*` | 8 | 7 days | No | user_id |
| `presence.*` | 4 | 1 day | Yes | user_id |
| `analytics.*` | 8 | 90 days | No | random |
| `notifications.*` | 4 | 7 days | No | user_id |
| `platform.audit` | 8 | 365 days | No | tenant_id |
| `internal.dlq` | 4 | 30 days | No | random |

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAFKA_BROKERS` | Kafka broker list | `kafka-1:29092,kafka-2:29092,kafka-3:29092` | ✅ |
| `KAFKA_CLIENT_ID` | Client identifier | `caas-service` | ✅ |
| `SCHEMA_REGISTRY_URL` | Schema registry URL | `http://schema-registry:8081` | ✅ |
| `PRODUCER_ACKS` | Producer acknowledgment | `all` | ❌ |
| `PRODUCER_COMPRESSION` | Compression type | `snappy` | ❌ |
| `CONSUMER_GROUP_ID` | Default consumer group | `caas-consumer-group` | ❌ |
| `DEFAULT_PARTITIONS` | Default partition count | `3` | ❌ |
| `DEFAULT_REPLICATION_FACTOR` | Default replication | `3` | ❌ |
| `MESSAGE_RETENTION_DAYS` | Default retention | `30` | ❌ |

### Kafka Cluster Settings

The service is optimized for the following cluster configuration:

- **Brokers**: 3 (minimum for HA)
- **Replication Factor**: 3
- **Min In-Sync Replicas**: 2
- **Compression**: Snappy
- **Acknowledgments**: All replicas

### Producer Settings

- **Idempotent**: Enabled (exactly-once semantics)
- **Batching**: 16KB batch size, 5ms linger
- **Retries**: 3 attempts with exponential backoff
- **Max In-Flight**: 5 requests

### Consumer Settings

- **Auto Offset Reset**: Earliest
- **Enable Auto Commit**: False (manual commits)
- **Session Timeout**: 30 seconds
- **Max Poll Records**: 500

---

## 🔍 Monitoring

### Health Endpoints

The service provides health check capabilities:

```typescript
// Service health
const health = await kafkaService.getHealth();

// Broker health
const brokers = await healthCheck.checkBrokers();

// Topic health
const topics = await healthCheck.checkTopics();

// Cluster stats
const stats = await healthCheck.getStats();
```

### Metrics

Key metrics tracked:

- **Connection**: State, latency, errors
- **Topics**: Count, partitions, under-replicated
- **Brokers**: Count, controller, offline
- **Messages**: Throughput, latency, errors

### JMX Metrics

JMX metrics are exported for Prometheus monitoring:

- `kafka_server_*`: Server metrics
- `kafka_network_*`: Network metrics
- `kafka_controller_*`: Controller metrics
- `kafka_log_*`: Log metrics

---

## 🛠️ API Reference

### KafkaService

Main service class for initialization and management.

#### Methods

**`initialize()`**
- Returns: `Promise<void>`
- Initialize service, connect to Kafka, create topics

**`shutdown()`**
- Returns: `Promise<void>`
- Graceful shutdown

**`getHealth()`**
- Returns: `Promise<HealthCheckResult>`
- Get service health status

### TopicManager

Manages Kafka topics and configurations.

#### Methods

**`createTenantTopics(tenantId: string)`**
- Returns: `Promise<TenantTopicSet>`
- Create all topics for a tenant

**`deleteTenantTopics(tenantId: string)`**
- Returns: `Promise<void>`
- Delete all topics for a tenant

**`getTopicHealth()`**
- Returns: `Promise<TopicHealthResult>`
- Get health status of all topics

### PartitionStrategy

Handles partition key calculation and strategies.

#### Methods

**`createMessageKey(strategy: string, data: MessageData)`**
- Returns: `string`
- Create partition key for message

**`getRecommendedPartitions(strategy: string, load: LoadInfo)`**
- Returns: `number`
- Get recommended partition count

---

## 🔒 Security

### Authentication

- **SASL/SCRAM**: Disabled by default (development)
- **SSL/TLS**: Disabled by default (development)
- **ACLs**: Not configured (development)

### Production Security

For production deployment:

1. Enable SASL authentication:
```env
KAFKA_SASL_ENABLED=true
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
```

2. Enable SSL/TLS:
```env
KAFKA_SSL_ENABLED=true
```

3. Configure ACLs for service accounts

### Best Practices

1. **Use service accounts** for each application
2. **Rotate credentials** regularly
3. **Enable audit logging** for compliance
4. **Use IP whitelisting** for network security
5. **Monitor access patterns** for anomalies

---

## 🚨 Troubleshooting

### Connection Issues

```bash
# Check Kafka cluster status
docker-compose ps | grep kafka

# Check Kafka logs
docker-compose logs kafka-1

# Test connection
docker exec -it caas-kafka-1 kafka-broker-api-versions \
  --bootstrap-server localhost:9092
```

### Topic Issues

```bash
# List topics
docker exec -it caas-kafka-1 kafka-topics \
  --bootstrap-server localhost:9092 --list

# Describe topic
docker exec -it caas-kafka-1 kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe --topic platform.events
```

### Schema Registry Issues

```bash
# Check schema registry
curl http://localhost:8081/subjects

# Check schema registry logs
docker-compose logs schema-registry
```

### Common Issues

**"Topic already exists"**
- Normal during initialization
- Topics are created with `--if-not-exists` flag

**"Not enough replicas"**
- Check that all brokers are running
- Verify `min.insync.replicas` configuration

**"Connection timeout"**
- Check network connectivity
- Verify broker addresses in configuration

**"Schema not found"**
- Ensure schema registry is running
- Check schema registration

---

## 📈 Performance Optimization

### Topic Configuration

```typescript
// High-throughput topics
{
  partitions: 16,
  compression: 'snappy',
  batchSize: 32768,
  lingerMs: 10
}

// Low-latency topics
{
  partitions: 4,
  compression: 'none',
  batchSize: 1024,
  lingerMs: 0
}
```

### Producer Optimization

- Use batching for high throughput
- Enable compression for large messages
- Tune `linger.ms` for latency vs throughput
- Monitor producer metrics

### Consumer Optimization

- Use appropriate `max.poll.records`
- Implement proper error handling
- Monitor consumer lag
- Use parallel processing where possible

---

## 🔄 Development Workflow

### Adding New Topics

1. Define topic in `topic-definitions.ts`
2. Add to appropriate category (platform/tenant/internal)
3. Specify partition strategy and configuration
4. Update topic manager if needed
5. Test topic creation and configuration

### Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires Kafka)
npm run test:integration

# Test topic creation
npm run test:topics
```

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Monitor Kafka logs
docker-compose logs -f kafka-1

# Use Kafka UI for visual debugging
open http://localhost:8080
```

---

## 📝 Next Steps

1. **Implement Producers** - Create producer patterns for different event types
2. **Implement Consumers** - Create consumer patterns with error handling
3. **Add Schema Registry** - Implement Avro/JSON schema management
4. **Add Monitoring** - Integrate with Prometheus/Grafana
5. **Add Security** - Implement SASL/SSL for production

---

## 📞 Support

For issues or questions:
- Check [Docker Setup Guide](../../local/SETUP_GUIDE.md)
- Review [Task Documentation](../../tasks/phases/phase-1-infrastructure/kafka-service/README.md)
- See main project [README](../../README.md)

---

**Last Updated:** 2026-01-27  
**Version:** 1.0.0  
**Status:** ✅ Core Infrastructure Complete
