# Monitoring & Analytics - Logging Architecture

> **Parent Roadmap**: [Monitoring & Analytics](../../roadmaps/9_monitorLogAnalyticsCrawler.md)

---

## Overview

Centralized logging infrastructure for all CAAS services with structured logging, aggregation, and search.

---

## 1. Logging Stack

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Services   │───▶│   Promtail   │───▶│     Loki     │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                                        ┌──────▼───────┐
                                        │   Grafana    │
                                        └──────────────┘
```

---

## 2. Structured Logging

### Log Format
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  service: string;
  traceId: string;
  spanId: string;
  tenantId?: string;
  userId?: string;
  context: Record<string, any>;
}

// Example
logger.info('Message sent', {
  event: 'message_sent',
  tenantId: 'tenant-123',
  conversationId: 'conv-456',
  messageType: 'text',
  durationMs: 45
});
```

### Logger Configuration
```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['password', 'token', 'apiKey', 'email'],
  base: {
    service: process.env.SERVICE_NAME,
    version: process.env.APP_VERSION,
  }
});
```

---

## 3. Log Aggregation

### Promtail Configuration
```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: caas-services
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            tenantId: tenantId
      - labels:
          level:
          service:
          tenantId:
```

---

## 4. Multi-Tenant Isolation

### Tenant Label Strategy
```yaml
# Each log entry tagged with tenant_id
labels:
  tenant_id: "tenant-123"
  service: "socket-service"
  environment: "production"
```

### Query Isolation
```logql
{tenant_id="tenant-123"} |= "error" | json | level="error"
```

---

## 5. Log Retention

| Log Type | Hot Storage | Warm Storage | Cold Storage |
|----------|-------------|--------------|--------------|
| Application | 7 days | 30 days | 1 year |
| Security/Audit | 30 days | 90 days | 7 years |
| Debug | 1 day | - | - |

---

## 6. PII Redaction

```typescript
const sensitiveFields = [
  'password', 'token', 'apiKey', 'secret',
  'email', 'phone', 'ssn', 'creditCard'
];

function redactPII(obj: any): any {
  const redacted = { ...obj };
  for (const field of sensitiveFields) {
    if (redacted[field]) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}
```

---

## Related Documents
- [Distributed Tracing](./distributed-tracing.md)
- [Alerting Strategy](./alerting-strategy.md)
