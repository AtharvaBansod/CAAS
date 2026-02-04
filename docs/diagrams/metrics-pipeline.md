# Metrics Collection Pipeline

> Visual flow for collecting and processing service metrics.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CAAS Services                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Gateway  │  │ Socket   │  │ Auth     │  │ Billing  │  ...    │
│  │ /metrics │  │ /metrics │  │ /metrics │  │ /metrics │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼─────────────┼─────────────┼────────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
                    ┌────────▼────────┐
                    │   Prometheus    │
                    │   (Scraping)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
       │   Grafana   │ │  Alerting │ │ Long-term   │
       │ (Dashboards)│ │ (Rules)   │ │ (Thanos)    │
       └─────────────┘ └───────────┘ └─────────────┘
```

---

## Metric Types

### 1. Counter (Cumulative)
```typescript
const httpRequestsTotal = new Counter({
  name: 'caas_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status']
});

// Usage
httpRequestsTotal.inc({ method: 'POST', path: '/messages', status: 200 });
```

### 2. Gauge (Point-in-time)
```typescript
const activeConnections = new Gauge({
  name: 'caas_socket_connections_active',
  help: 'Active WebSocket connections',
  labelNames: ['server_id']
});

// Usage
activeConnections.set({ server_id: 'socket-1' }, 5432);
```

### 3. Histogram (Distribution)
```typescript
const requestDuration = new Histogram({
  name: 'caas_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Usage
const end = requestDuration.startTimer();
// ... process request
end({ method: 'GET', path: '/messages' });
```

---

## Key Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `caas_http_requests_total` | Counter | method, path, status |
| `caas_request_duration_seconds` | Histogram | method, path |
| `caas_socket_connections_active` | Gauge | server_id |
| `caas_messages_sent_total` | Counter | tenant_id, type |
| `caas_kafka_consumer_lag` | Gauge | topic, partition |

---

## Prometheus Config

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'caas-services'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

---

## Related Documents
- [Logging Architecture](../deepDive/monitorAnalytics/logging-architecture.md)
- [Distributed Tracing](../deepDive/monitorAnalytics/distributed-tracing.md)
