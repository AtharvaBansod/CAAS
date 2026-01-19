# Kafka Service - Message Schema

> **Parent Roadmap**: [Kafka Service](../../roadmaps/8_kafkaService.md)

---

## Overview

Event schema design and schema registry integration for Kafka messages.

---

## 1. Schema Registry Setup

```typescript
import { SchemaRegistry, SchemaType } from '@kafkajs/confluent-schema-registry';

const registry = new SchemaRegistry({
  host: 'http://schema-registry:8081'
});

// Register schema
async function registerSchema(subject: string, schema: object): Promise<number> {
  const { id } = await registry.register({
    type: SchemaType.AVRO,
    schema: JSON.stringify(schema)
  }, { subject });
  
  return id;
}
```

---

## 2. Event Envelope

```typescript
interface EventEnvelope<T> {
  // Metadata
  id: string;                    // Unique event ID
  type: string;                  // Event type
  version: string;               // Schema version
  source: string;                // Originating service
  timestamp: Date;               // Event time
  
  // Routing
  tenantId: string;
  correlationId?: string;        // For request tracing
  causationId?: string;          // Parent event ID
  
  // Payload
  data: T;
}
```

---

## 3. Avro Schemas

### Message Created Event
```json
{
  "type": "record",
  "name": "MessageCreated",
  "namespace": "io.caas.events.chat",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "type", "type": "string", "default": "message.created" },
    { "name": "version", "type": "string", "default": "1.0" },
    { "name": "source", "type": "string" },
    { "name": "timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "tenantId", "type": "string" },
    { "name": "correlationId", "type": ["null", "string"], "default": null },
    { "name": "data", "type": {
      "type": "record",
      "name": "MessageData",
      "fields": [
        { "name": "messageId", "type": "string" },
        { "name": "conversationId", "type": "string" },
        { "name": "senderId", "type": "string" },
        { "name": "content", "type": "string" },
        { "name": "messageType", "type": "string" },
        { "name": "attachments", "type": { "type": "array", "items": "string" } }
      ]
    }}
  ]
}
```

### User Presence Event
```json
{
  "type": "record",
  "name": "UserPresence",
  "namespace": "io.caas.events.presence",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "type", "type": "string", "default": "presence.updated" },
    { "name": "timestamp", "type": "long", "logicalType": "timestamp-millis" },
    { "name": "tenantId", "type": "string" },
    { "name": "data", "type": {
      "type": "record",
      "name": "PresenceData",
      "fields": [
        { "name": "userId", "type": "string" },
        { "name": "status", "type": { 
          "type": "enum", 
          "name": "PresenceStatus",
          "symbols": ["ONLINE", "OFFLINE", "AWAY", "DND"]
        }},
        { "name": "lastSeenAt", "type": ["null", "long"], "default": null }
      ]
    }}
  ]
}
```

---

## 4. Schema Evolution

### Compatible Changes
- Add optional field with default
- Remove optional field
- Add new enum value (at end)

### Breaking Changes (avoid)
- Remove required field
- Change field type
- Rename field

```typescript
// Version 2: Added replyTo field
{
  "name": "replyTo",
  "type": ["null", "string"],
  "default": null
}
```

---

## 5. Producer with Schema

```typescript
class SchemaProducer<T> {
  private schemaId: number;
  
  constructor(private topic: string, schema: object) {
    this.schemaId = await registry.register(
      `${topic}-value`,
      schema
    );
  }
  
  async send(event: EventEnvelope<T>): Promise<void> {
    const encoded = await registry.encode(this.schemaId, event);
    
    await producer.send({
      topic: this.topic,
      messages: [{
        key: event.tenantId,
        value: encoded,
        headers: {
          'event-type': event.type,
          'schema-id': this.schemaId.toString()
        }
      }]
    });
  }
}
```

---

## 6. Consumer with Schema

```typescript
async function consumeWithSchema<T>(message: KafkaMessage): Promise<EventEnvelope<T>> {
  // Decode using schema from registry
  const decoded = await registry.decode(message.value!);
  
  return decoded as EventEnvelope<T>;
}
```

---

## Related Documents
- [Producer Patterns](./producer-patterns.md)
- [Consumer Patterns](./consumer-patterns.md)
