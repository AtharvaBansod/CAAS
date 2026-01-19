# Kafka Service - Producer Patterns

> **Parent Roadmap**: [Kafka Service](../../roadmaps/8_kafkaService.md)

---

## Overview

Best practices for Kafka message production in CAAS.

---

## 1. Producer Configuration

```typescript
import { Kafka, Producer, Partitioners } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'caas-gateway',
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092'],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-512',
    username: process.env.KAFKA_USER,
    password: process.env.KAFKA_PASSWORD
  }
});

const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  allowAutoTopicCreation: false,
  idempotent: true,  // Exactly-once semantics
  maxInFlightRequests: 5,
  transactionTimeout: 60000
});

await producer.connect();
```

---

## 2. Message Production

### Simple Send
```typescript
async function sendMessage(topic: string, message: any, key?: string) {
  await producer.send({
    topic,
    messages: [{
      key: key || null,
      value: JSON.stringify(message),
      headers: {
        'content-type': 'application/json',
        'trace-id': getTraceId(),
        'timestamp': Date.now().toString()
      }
    }]
  });
}
```

### Batch Production
```typescript
async function sendBatch(messages: ProducerMessage[]) {
  const topicMessages = messages.reduce((acc, msg) => {
    if (!acc[msg.topic]) acc[msg.topic] = [];
    acc[msg.topic].push({
      key: msg.key,
      value: JSON.stringify(msg.value),
      headers: msg.headers
    });
    return acc;
  }, {} as Record<string, any[]>);
  
  await producer.sendBatch({
    topicMessages: Object.entries(topicMessages).map(([topic, messages]) => ({
      topic,
      messages
    }))
  });
}
```

---

## 3. Partitioning Strategy

```typescript
// Custom partitioner for tenant isolation
const tenantPartitioner = () => {
  return ({ topic, partitionMetadata, message }) => {
    const tenantId = message.headers?.['tenant-id']?.toString();
    
    if (tenantId) {
      // Hash tenant ID to partition
      const hash = crypto.createHash('md5').update(tenantId).digest();
      const partition = hash.readUInt32BE(0) % partitionMetadata.length;
      return partition;
    }
    
    // Default partitioning by key
    if (message.key) {
      const hash = crypto.createHash('md5').update(message.key).digest();
      return hash.readUInt32BE(0) % partitionMetadata.length;
    }
    
    // Round-robin for keyless messages
    return Math.floor(Math.random() * partitionMetadata.length);
  };
};
```

---

## 4. Error Handling

```typescript
class ResilientProducer {
  private producer: Producer;
  private retryQueue: ProducerMessage[] = [];
  
  async send(message: ProducerMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: message.topic,
        messages: [{ key: message.key, value: message.value }]
      });
    } catch (error) {
      if (this.isRetryable(error)) {
        this.retryQueue.push(message);
        this.scheduleRetry();
      } else {
        // Send to DLQ
        await this.sendToDLQ(message, error);
        throw error;
      }
    }
  }
  
  private isRetryable(error: any): boolean {
    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'REQUEST_TIMED_OUT',
      'NOT_LEADER_OR_FOLLOWER'
    ];
    return retryableCodes.includes(error.code);
  }
  
  private async scheduleRetry(): Promise<void> {
    await sleep(1000); // Backoff
    
    const batch = this.retryQueue.splice(0, 100);
    for (const msg of batch) {
      await this.send(msg);
    }
  }
}
```

---

## 5. Transactions

```typescript
// Exactly-once semantics with transactions
async function processAndForward(inputMessage: Message) {
  const transaction = await producer.transaction();
  
  try {
    // Process message
    const result = transform(inputMessage);
    
    // Send to output topic
    await transaction.send({
      topic: 'output-topic',
      messages: [{ value: JSON.stringify(result) }]
    });
    
    // Commit offsets in same transaction
    await transaction.sendOffsets({
      consumerGroupId: 'my-group',
      topics: [{
        topic: 'input-topic',
        partitions: [{ partition: 0, offset: inputMessage.offset }]
      }]
    });
    
    await transaction.commit();
  } catch (error) {
    await transaction.abort();
    throw error;
  }
}
```

---

## 6. Metrics & Monitoring

```typescript
// Producer metrics
producer.on('producer.connect', () => {
  metrics.gauge('kafka_producer_connected', 1);
});

producer.on('producer.disconnect', () => {
  metrics.gauge('kafka_producer_connected', 0);
});

// Custom send wrapper with metrics
async function sendWithMetrics(topic: string, message: any) {
  const start = Date.now();
  
  try {
    await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
    
    metrics.counter('kafka_messages_sent_total', 1, { topic, status: 'success' });
    metrics.histogram('kafka_send_duration_ms', Date.now() - start, { topic });
  } catch (error) {
    metrics.counter('kafka_messages_sent_total', 1, { topic, status: 'error' });
    throw error;
  }
}
```

---

## Related Documents
- [Consumer Patterns](./consumer-patterns.md)
- [Cluster Configuration](./cluster-configuration.md)
