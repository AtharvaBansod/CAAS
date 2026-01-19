# Public Gateway - Observability

> **Parent Roadmap**: [Public Gateway](../../roadmaps/2_publicalllyExposedGateway.md)

---

## Overview

Logging, metrics, and tracing implementation for the API gateway.

---

## 1. Structured Logging

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  redact: ['req.headers.authorization', 'req.body.password'],
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id']
      }
    }),
    res: (res) => ({
      statusCode: res.statusCode
    })
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      type: 'request',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      tenantId: req.tenantId,
      userId: req.userId
    });
  });
  
  next();
});
```

---

## 2. Metrics Collection

```typescript
import { collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default Node.js metrics
collectDefaultMetrics();

// Custom metrics
const httpRequestsTotal = new Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status']
});

const httpRequestDuration = new Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

const activeConnections = new Gauge({
  name: 'gateway_active_connections',
  help: 'Number of active connections'
});

// Metrics middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  
  res.on('finish', () => {
    end({ method: req.method, path: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      path: req.route?.path || 'unknown',
      status: res.statusCode
    });
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});
```

---

## 3. Distributed Tracing

```typescript
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api';

const tracer = trace.getTracer('gateway');

// Tracing middleware
app.use((req, res, next) => {
  const parentContext = propagation.extract(context.active(), req.headers);
  
  const span = tracer.startSpan(
    `${req.method} ${req.path}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path,
        'tenant.id': req.tenantId
      }
    },
    parentContext
  );
  
  // Store span in request context
  req.span = span;
  
  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    
    if (res.statusCode >= 400) {
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    
    span.end();
  });
  
  // Continue with span context
  context.with(trace.setSpan(context.active(), span), () => {
    next();
  });
});
```

---

## 4. Error Tracking

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true })
  ]
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.withScope((scope) => {
    scope.setTag('tenant_id', req.tenantId);
    scope.setUser({ id: req.userId });
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: req.headers
    });
    
    Sentry.captureException(err);
  });
  
  logger.error({ err, requestId: req.id }, 'Request error');
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 5. Dashboard Queries

```promql
# Request rate
rate(gateway_http_requests_total[5m])

# Error rate
sum(rate(gateway_http_requests_total{status=~"5.."}[5m])) / 
sum(rate(gateway_http_requests_total[5m]))

# Latency p99
histogram_quantile(0.99, rate(gateway_http_request_duration_seconds_bucket[5m]))

# Active connections by instance
gateway_active_connections
```

---

## 6. Key Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Overview | RPS, Error Rate, Latency |
| Endpoints | Per-endpoint latency, volume |
| Errors | Error breakdown, stack traces |
| Tenants | Per-tenant usage, rate limits |

---

## Related Documents
- [Configuration Management](./configuration-management.md)
- [Metrics Pipeline](../../flowdiagram/metrics-pipeline.md)
