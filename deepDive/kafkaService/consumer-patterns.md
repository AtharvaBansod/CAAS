# Kafka Consumer Patterns

> **Parent Roadmap**: [Kafka Service](../../roadmaps/8_kafkaService.md)

---

## Overview

Consumer implementation patterns for reliable message processing.

---

## 1. Consumer Group Setup

```typescript
import { Kafka, Consumer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'caas-processor',
  brokers: ['kafka-1:9092', 'kafka-2:9092', 'kafka-3:9092']
});

async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId,
    maxWaitTimeInMs: 100,
    sessionTimeout: 30000,
    heartbeatInterval: 3000
  });
  
  await consumer.connect();
  return consumer;
}
```

---

## 2. At-Least-Once Processing

```typescript
async function consumeMessages(consumer: Consumer, topic: string) {
  await consumer.subscribe({ topic, fromBeginning: false });
  
  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value!.toString());
        
        // Process message
        await processEvent(event);
        
        // Commit only after successful processing
        await consumer.commitOffsets([{
          topic,
          partition,
          offset: (parseInt(message.offset, 10) + 1).toString()
        }]);
        
      } catch (error) {
        // Handle error without committing
        await handleProcessingError(error, message);
      }
    }
  });
}
```

---

## 3. Batch Processing

```typescript
await consumer.run({
  autoCommit: false,
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    const messages = batch.messages;
    
    // Process in chunks
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      
      await Promise.all(chunk.map(msg => 
        processEvent(JSON.parse(msg.value!.toString()))
      ));
      
      // Commit last processed offset
      resolveOffset(chunk[chunk.length - 1].offset);
      
      // Send heartbeat to prevent rebalance
      await heartbeat();
    }
  }
});
```

---

## 4. Dead Letter Queue

```typescript
async function handleProcessingError(error: Error, message: Message) {
  const retryCount = getRetryCount(message);
  
  if (retryCount < MAX_RETRIES) {
    // Retry with backoff
    await producer.send({
      topic: `${message.topic}.retry`,
      messages: [{
        ...message,
        headers: {
          ...message.headers,
          'retry-count': (retryCount + 1).toString()
        }
      }]
    });
  } else {
    // Send to DLQ for manual inspection
    await producer.send({
      topic: `${message.topic}.dlq`,
      messages: [{
        ...message,
        headers: {
          ...message.headers,
          'error-message': error.message,
          'failed-at': new Date().toISOString()
        }
      }]
    });
  }
}
```

---

## 5. Idempotency

```typescript
async function processEventIdempotently(event: Event) {
  const eventId = event.id;
  
  // Check if already processed
  const processed = await redis.get(`processed:${eventId}`);
  if (processed) {
    return; // Skip duplicate
  }
  
  // Process event
  await handleEvent(event);
  
  // Mark as processed (with TTL for cleanup)
  await redis.setex(`processed:${eventId}`, 86400, '1');
}
```

---

## 6. Consumer Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| Consumer Lag | > 10,000 |
| Processing Time (p99) | > 5s |
| Error Rate | > 1% |
| Rebalance Frequency | > 3/hour |

---

## Related Documents
- [Cluster Configuration](./cluster-configuration.md)
- [Kafka Topic Architecture](../../flowdiagram/kafka-topic-architecture.md)
