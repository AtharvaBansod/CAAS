# Phase 5: Observability & Analytics

## Overview
Monitoring, logging, metrics, and analytics dashboards for both platform operations and client-facing insights.

## Feature Areas

| Folder | Description | Tasks |
|--------|-------------|-------|
| `logging/` | Centralized logging with structured logs | 8 tasks |
| `metrics/` | Prometheus metrics and alerting | 8 tasks |
| `analytics/` | Client analytics dashboards (in clientFacingUI) | 8 tasks |
| `health/` | Health checks and status pages | 4 tasks |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Observability Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Services ──► Pino Logs ──► Vector ──► Loki ──► Grafana            │
│       │                                              (internal)      │
│       │                                                              │
│       ├──► Prometheus Metrics ──► Prometheus ──► Alertmanager       │
│       │                                │                             │
│       │                                └──► Grafana (internal)       │
│       │                                                              │
│       └──► Analytics Events ──► Kafka ──► Analytics Service         │
│                                               │                      │
│                                               └──► clientFacingUI    │
│                                                    (dashboards)      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Decisions

### Internal vs Client-Facing
- **Internal (Grafana)**: Platform operations, infrastructure metrics, service health
- **Client-Facing (clientFacingUI)**: Tenant analytics dashboards, usage metrics, message statistics

### Logging Strategy
- Structured JSON logs with Pino
- Correlation IDs for request tracing
- Sensitive data redaction
- Log levels by environment

### Metrics Strategy
- RED metrics (Rate, Errors, Duration)
- Business metrics (messages/day, users, etc.)
- Per-tenant metrics for billing
- Alert thresholds

## Dependencies

- Phase 1: Gateway (for request logging)
- Phase 3: Socket.IO (for real-time metrics)
- Phase 4: Messaging (for message analytics)

## Estimated Effort

- Total Tasks: 28
- Total Hours: ~112 hours
- Priority: High (operational visibility)
