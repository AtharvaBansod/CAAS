# Distributed Tracing Implementation

> **Parent Roadmap**: [Monitoring & Analytics](../../roadmaps/9_monitorLogAnalyticsCrawler.md)

---

## Overview

OpenTelemetry-based distributed tracing across all CAAS microservices.

---

## 1. Tracing Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Gateway  │───▶│   Auth   │───▶│ MongoDB  │
└────┬─────┘    └────┬─────┘    └──────────┘
     │               │
     ▼               ▼
┌──────────┐    ┌──────────┐
│  Socket  │    │  Kafka   │
└────┬─────┘    └──────────┘
     │
     └──────────────────────────────────────▶ [Jaeger/Tempo]
```

---

## 2. OpenTelemetry Setup

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.SERVICE_NAME,
    'service.version': process.env.APP_VERSION,
    'deployment.environment': process.env.NODE_ENV
  }),
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true }
    })
  ]
});

sdk.start();
```

---

## 3. Manual Span Creation

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('caas-socket-service');

async function handleMessage(message: Message) {
  const span = tracer.startSpan('handle_message', {
    attributes: {
      'message.type': message.type,
      'message.conversation_id': message.conversationId,
      'tenant.id': message.tenantId
    }
  });
  
  try {
    await processMessage(message);
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

---

## 4. Context Propagation

```typescript
// HTTP: Inject trace context into headers
import { context, propagation } from '@opentelemetry/api';

async function callDownstreamService(url: string) {
  const headers = {};
  propagation.inject(context.active(), headers);
  
  return fetch(url, { headers });
}

// Kafka: Include trace context in message headers
async function produceWithTrace(topic: string, message: any) {
  const headers = {};
  propagation.inject(context.active(), headers);
  
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message), headers }]
  });
}
```

---

## 5. Sampling Configuration

```typescript
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces in production
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1)
});

// Always sample errors
const alwaysSampleErrors = (spanContext, traceState) => {
  if (spanContext.attributes['error'] === true) {
    return { decision: SamplingDecision.RECORD_AND_SAMPLED };
  }
  return sampler.shouldSample(spanContext, traceState);
};
```

---

## Related Documents
- [Logging Architecture](./logging-architecture.md)
- [Alerting Strategy](./alerting-strategy.md)
