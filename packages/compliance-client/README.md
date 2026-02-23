# @caas/compliance-client

Centralized compliance client library for all CAAS services. Provides consistent audit logging, GDPR compliance, and data retention management across the platform.

## Features

- **Audit Logging**: Log all user actions and system events
- **Batching**: Automatic batching for high-performance logging
- **Circuit Breaker**: Resilient to compliance service failures
- **Retry Logic**: Automatic retry with exponential backoff
- **GDPR Support**: Consent management, data export, erasure requests
- **Retention Policies**: Automated data retention and cleanup

## Installation

This package is used internally within the CAAS monorepo:

```bash
npm install file:../../packages/compliance-client
```

## Usage

### Basic Setup

```typescript
import { createComplianceClient } from '@caas/compliance-client';

const complianceClient = createComplianceClient({
  baseURL: 'http://compliance-service:3008',
  timeout: 10000,
  batching: {
    enabled: true,
    maxBatchSize: 100,
    flushInterval: 5000
  }
});
```

### Logging Audit Events

```typescript
// Log a single audit event
await complianceClient.logAudit({
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  action: 'USER_LOGIN',
  resource_type: 'authentication',
  resource_id: 'session-789',
  metadata: {
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0...'
  }
});
```

### Batched Logging (Recommended)

```typescript
// Events are automatically batched
complianceClient.logAudit({ /* event 1 */ });
complianceClient.logAudit({ /* event 2 */ });
complianceClient.logAudit({ /* event 3 */ });
// Batch is automatically flushed every 5 seconds or when 100 events are buffered
```

### Query Audit Logs

```typescript
const logs = await complianceClient.queryAudit({
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  action: 'USER_LOGIN',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  limit: 100
});
```

### GDPR Consent Management

```typescript
// Record user consent
const consentId = await complianceClient.recordConsent({
  user_id: 'user-456',
  tenant_id: 'tenant-123',
  consent_type: 'data_processing',
  consent_given: true,
  consent_text: 'I agree to data processing...',
  version: '1.0',
  ip_address: '192.168.1.1'
});

// Get user consents
const consents = await complianceClient.getConsent('user-456', 'tenant-123');

// Revoke consent
await complianceClient.revokeConsent(consentId);
```

### GDPR Data Requests

```typescript
// Submit data export request
const requestId = await complianceClient.submitGDPRRequest({
  user_id: 'user-456',
  tenant_id: 'tenant-123',
  request_type: 'export'
});

// Check request status
const status = await complianceClient.getGDPRRequestStatus(requestId);
```

### Graceful Shutdown

```typescript
// Flush remaining events before shutdown
process.on('SIGTERM', async () => {
  await complianceClient.shutdown();
  process.exit(0);
});
```

## Configuration Options

```typescript
interface ComplianceClientConfig {
  baseURL: string;                    // Compliance service URL
  timeout?: number;                   // Request timeout (default: 10000ms)
  retries?: number;                   // Retry attempts (default: 3)
  circuitBreaker?: {
    failureThreshold: number;         // Failures before opening (default: 30)
    resetTimeout: number;             // Time before retry (default: 60000ms)
    monitoringPeriod: number;         // Monitoring window (default: 30000ms)
  };
  batching?: {
    enabled: boolean;                 // Enable batching (default: true)
    maxBatchSize: number;             // Max events per batch (default: 100)
    flushInterval: number;            // Flush interval (default: 5000ms)
  };
}
```

## Circuit Breaker States

- **CLOSED**: Normal operation, requests go through
- **OPEN**: Too many failures, requests are blocked
- **HALF_OPEN**: Testing if service recovered

```typescript
// Check circuit breaker state
const state = complianceClient.getCircuitBreakerState();
const isHealthy = complianceClient.isHealthy();
```

## Best Practices

1. **Use Batching**: Enable batching for high-volume logging
2. **Handle Failures**: Circuit breaker prevents cascading failures
3. **Graceful Shutdown**: Always call `shutdown()` before process exit
4. **Don't Log Sensitive Data**: Never log passwords, keys, or plaintext
5. **Use Metadata**: Include context in metadata field for better auditing

## Example: Express Middleware

```typescript
import { createComplianceClient } from '@caas/compliance-client';

const complianceClient = createComplianceClient({
  baseURL: process.env.COMPLIANCE_SERVICE_URL
});

export function complianceMiddleware(req, res, next) {
  res.on('finish', () => {
    complianceClient.logAudit({
      tenant_id: req.user?.tenant_id || 'anonymous',
      user_id: req.user?.user_id,
      action: `${req.method}_${req.path}`,
      resource_type: 'api_request',
      resource_id: req.id,
      metadata: {
        method: req.method,
        url: req.url,
        status_code: res.statusCode,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }
    }).catch(err => {
      console.error('Failed to log audit event:', err);
    });
  });
  next();
}
```

## License

Internal use only - CAAS Platform
