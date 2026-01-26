# Logging Feature

## Overview
Centralized structured logging with Pino, log aggregation, and search capabilities.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `01-structured-logging.json` | LOG-001 to LOG-004 | Pino setup and structured logs |
| `02-log-aggregation.json` | LOG-005 to LOG-008 | Vector, Loki, log search |

## Log Format

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "msg": "Request completed",
  "requestId": "req-123",
  "traceId": "trace-456",
  "tenantId": "tenant-789",
  "userId": "user-abc",
  "method": "POST",
  "path": "/v1/messages",
  "statusCode": 201,
  "duration": 45
}
```

## Dependencies

- All services emit logs
- Kafka for log streaming (optional)
