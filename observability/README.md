# CAAS Platform Observability Stack

## Overview

This directory contains the observability infrastructure for the CAAS platform, implementing Phase 5 (Step 6) - Observability Final Hardening.

## Components

### 1. OpenTelemetry Collector
- **Purpose**: Receives, processes, and exports telemetry data (traces, metrics, logs)
- **Port**: 4317 (gRPC), 4318 (HTTP)
- **Config**: `otel-collector-config.yaml`

### 2. Jaeger
- **Purpose**: Distributed tracing backend and UI
- **Port**: 16686 (UI), 14268 (HTTP collector), 14250 (gRPC collector)
- **Storage**: Badger (embedded)

### 3. Prometheus
- **Purpose**: Metrics collection and storage
- **Port**: 9090
- **Config**: `prometheus.yml`
- **Scrape Interval**: 15s
- **Retention**: 30 days

### 4. Grafana
- **Purpose**: Visualization and dashboards
- **Port**: 3200
- **Credentials**: admin/admin123
- **Dashboards**: Pre-configured in `grafana/dashboards/`

### 5. Loki
- **Purpose**: Log aggregation
- **Port**: 3201
- **Config**: `loki-config.yaml`

### 6. Promtail
- **Purpose**: Log shipping to Loki
- **Config**: `promtail-config.yaml`

### 7. AlertManager
- **Purpose**: Alert routing and management
- **Port**: 9093
- **Config**: `alertmanager.yml`

## Alert Rules

### Service Alerts (`alerts/service-alerts.yml`)
- Service availability monitoring
- High error rate detection
- High latency warnings
- Auth service SLOs
- Socket service health
- Kafka consumer lag
- Infrastructure health

### SLO Alerts (`alerts/slo-alerts.yml`)
- Availability SLO breaches
- Latency SLO breaches
- Error budget burn rate (fast and slow)
- Synthetic probe failures
- Data freshness monitoring

## Metrics Endpoints

All services expose metrics at `/metrics`:

- **Gateway**: http://localhost:3000/metrics
- **Auth Service**: http://localhost:3007/metrics
- **Socket Service 1**: http://localhost:3002/metrics
- **Socket Service 2**: http://localhost:3003/metrics
- **Kafka Service**: http://localhost:3010/metrics
- **Search Service**: http://localhost:3006/metrics
- **Media Service**: http://localhost:3005/metrics

## Dashboards

### Gateway Dashboard
- Request rate by method and status
- Request latency (P50, P95, P99)
- Error rate
- Active connections
- Top routes by request count
- Top routes by latency

### Auth Service Dashboard
- Login attempts and failures
- Token generation rate
- Refresh token usage
- MFA challenges
- Session management

### Socket Service Dashboard
- Active connections by namespace
- Message fanout rate
- Disconnect rate
- Event processing latency

### Kafka Service Dashboard
- Message production rate
- Message consumption rate
- Consumer lag by topic
- Persistence latency
- DLQ message rate

## Accessing the Stack

### Grafana
```
URL: http://localhost:3200
Username: admin
Password: admin123
```

### Jaeger UI
```
URL: http://localhost:16686
```

### Prometheus
```
URL: http://localhost:9090
```

### AlertManager
```
URL: http://localhost:9093
```

## Correlation ID Tracking

All requests are tracked with correlation IDs:

1. **Header**: `x-correlation-id`
2. **Propagation**: Across all services (Gateway → Auth → Socket → Kafka)
3. **Tracing**: Linked to OpenTelemetry trace IDs
4. **Logging**: Included in all structured logs

### Example: Tracking a Request

```bash
# Make a request with correlation ID
curl -H "x-correlation-id: 12345" http://localhost:3000/api/v1/conversations

# Search logs in Loki
{service="gateway"} |= "12345"

# Find trace in Jaeger
# Search by tag: correlation.id=12345
```

## SLO Definitions

### Gateway
- **Availability**: 99.9%
- **Latency (P95)**: < 500ms
- **Error Budget**: 0.1% (43.2 minutes/month)

### Auth Service
- **Availability**: 99.95%
- **Latency (P95)**: < 200ms
- **Error Budget**: 0.05% (21.6 minutes/month)

### Socket Service
- **Message Fanout Latency (P95)**: < 100ms
- **Connection Success Rate**: > 99%

### Kafka Service
- **Persistence Latency (P95)**: < 2s
- **Consumer Lag**: < 10,000 messages (warning), < 50,000 (critical)

## Runbooks

Alert runbooks are linked in alert annotations:

- **Service Down**: https://runbooks.caas/service-down
- **High Error Rate**: https://runbooks.caas/high-error-rate
- **High Latency**: https://runbooks.caas/high-latency
- **Auth Failures**: https://runbooks.caas/auth-failures
- **Socket Disconnect Storm**: https://runbooks.caas/socket-disconnect-storm
- **Kafka Lag**: https://runbooks.caas/kafka-lag

## Telemetry Package

The `@caas/telemetry` package provides:

- **OpenTelemetry SDK**: Auto-instrumentation for HTTP, MongoDB, Redis, Kafka
- **Metrics Collector**: Prometheus-compatible metrics
- **Structured Logger**: Pino-based logging with PII redaction
- **Correlation Management**: Async context tracking

### Usage Example

```typescript
import { initializeTelemetry } from '@caas/telemetry';

const { metrics, shutdown } = initializeTelemetry({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
});

// Record metrics
metrics.recordHttpRequest('GET', '/api/users', 200, 0.123);

// Shutdown on exit
process.on('SIGTERM', async () => {
  await shutdown();
});
```

## Testing Observability

### 1. Check Metrics Endpoints
```bash
curl http://localhost:3000/metrics
curl http://localhost:3007/metrics
```

### 2. Generate Load
```bash
# Run e2e tests to generate telemetry
docker compose --profile test run e2e-fresh
```

### 3. View Traces
1. Open Jaeger: http://localhost:16686
2. Select service: gateway
3. Find traces with operations

### 4. View Metrics
1. Open Prometheus: http://localhost:9090
2. Query: `rate(http_requests_total[5m])`
3. View graphs

### 5. View Dashboards
1. Open Grafana: http://localhost:3200
2. Navigate to Dashboards
3. Select "Gateway Service Dashboard"

### 6. Test Alerts
```bash
# Trigger high error rate
for i in {1..100}; do
  curl http://localhost:3000/api/v1/invalid-endpoint
done

# Check AlertManager
open http://localhost:9093
```

## Troubleshooting

### Metrics Not Appearing

1. Check service health:
```bash
curl http://localhost:3000/health
```

2. Check OTEL Collector:
```bash
docker logs caas-otel-collector
```

3. Check Prometheus targets:
```
http://localhost:9090/targets
```

### Traces Not Appearing

1. Check OTEL Collector logs:
```bash
docker logs caas-otel-collector
```

2. Check Jaeger:
```bash
docker logs caas-jaeger
```

3. Verify OTEL endpoint in service:
```bash
docker exec caas-gateway env | grep OTEL
```

### Logs Not Appearing

1. Check Loki:
```bash
docker logs caas-loki
```

2. Check Promtail:
```bash
docker logs caas-promtail
```

3. Query Loki directly:
```bash
curl -G -s "http://localhost:3201/loki/api/v1/query" \
  --data-urlencode 'query={service="gateway"}' | jq
```

## Performance Impact

Observability overhead:

- **Tracing**: < 1% CPU, < 50MB memory per service
- **Metrics**: < 0.5% CPU, < 20MB memory per service
- **Logging**: < 0.5% CPU, < 30MB memory per service

**Total**: < 2% CPU, < 100MB memory per service

## Security

### PII Redaction

The telemetry package automatically redacts:
- Passwords
- Tokens (access, refresh, API keys)
- Secrets
- Authorization headers
- Cookies

### Metrics Cardinality

Label cardinality is bounded:
- Tenant IDs: Hashed or limited
- User IDs: Not included in high-cardinality metrics
- Route patterns: Parameterized (e.g., `/users/:id`)

## Maintenance

### Retention Policies

- **Prometheus**: 30 days
- **Jaeger**: 7 days (configurable)
- **Loki**: 30 days

### Backup

Prometheus data is stored in Docker volume `prometheus_data`.

To backup:
```bash
docker run --rm -v caas_prometheus_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/prometheus-backup.tar.gz /data
```

## Future Enhancements

- [ ] Synthetic monitoring probes
- [ ] Custom business metrics
- [ ] Cost attribution by tenant
- [ ] Anomaly detection
- [ ] Capacity planning dashboards
- [ ] SLO reporting automation
