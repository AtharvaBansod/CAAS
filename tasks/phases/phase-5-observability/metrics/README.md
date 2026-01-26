# Metrics Feature

## Overview
Prometheus metrics collection, alerting, and internal dashboards for platform monitoring.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `01-prometheus-setup.json` | METRIC-001 to METRIC-004 | Prometheus and metric collection |
| `02-alerting.json` | METRIC-005 to METRIC-008 | Alert rules and notifications |

## Metrics Categories

### RED Metrics
- **R**ate: Request/message rate
- **E**rrors: Error count and rate
- **D**uration: Latency percentiles

### Business Metrics
- Messages per day
- Active users
- Conversations created
- Media uploads

### Infrastructure Metrics
- CPU, memory, disk
- Database connections
- Kafka lag
- Redis memory

## Note
This is for internal CAAS platform monitoring only.
Client-facing analytics dashboards are in the `analytics/` folder.
