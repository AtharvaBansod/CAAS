# CaaS Node.js / TypeScript SDK — Quickstart

## Installation

```bash
npm install @caas/sdk-node-ts
```

## Secure Configuration

```typescript
import { CaasNodeSdk } from '@caas/sdk-node-ts';

const sdk = new CaasNodeSdk({
  gatewayBaseUrl: process.env.CAAS_GATEWAY_URL!,  // e.g. http://gateway:3000
  apiKey: process.env.CAAS_API_KEY!,               // Never hard-code
  projectId: process.env.CAAS_PROJECT_ID,
  defaultTimeoutMs: 10_000,
  retry: { maxRetries: 3, baseDelayMs: 300, maxDelayMs: 10_000 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 30_000 },
});
```

> **API Key Security**: Your API key authenticates server-to-server calls.
> - Store in environment variables or a secrets manager (Vault, AWS SSM, etc.).
> - Never expose API keys in client-side code or logs.
> - Use project-scoped keys to limit blast radius.
> - Rotate keys regularly (see _API Key Rotation_ below).

## Usage

### Health Check

```typescript
const health = await sdk.health();
console.log(health); // { status: 'ok', ... }
```

### Create Session

```typescript
const session = await sdk.createSession({
  user_external_id: 'user-123',
  project_id: 'proj-abc',          // optional if configured globally
});

console.log(session.access_token);
console.log(session.refresh_token);
console.log(session.expires_in);   // seconds
```

### Refresh Session

```typescript
const refreshed = await sdk.refresh(session.refresh_token);
```

### Logout

```typescript
await sdk.logout(session.access_token);
```

## Error Handling

The SDK throws typed errors you can branch on by `code`:

```typescript
import {
  SdkError, SdkAuthError, SdkThrottleError,
  SdkServerError, SdkCircuitOpenError
} from '@caas/sdk-node-ts';

try {
  await sdk.createSession({ user_external_id: 'u1' });
} catch (err) {
  if (err instanceof SdkAuthError) {
    // 401/403 — invalid key, expired, etc.
    console.error('Auth problem:', err.code, err.status);
  } else if (err instanceof SdkThrottleError) {
    // 429 — back off, retryAfterMs may be set
    console.warn('Rate limited, retry after:', err.retryAfterMs);
  } else if (err instanceof SdkCircuitOpenError) {
    // Too many failures — circuit breaker tripped
    console.error('Circuit open — wait before retrying');
  } else if (err instanceof SdkError) {
    // Generic SDK error — check err.code, err.retryable
    console.error(err.code, err.retryable);
  }
}
```

| Error Code | HTTP Status | Retryable | Notes |
|---|---|---|---|
| `AUTH_ERROR` | 401, 403 | No | Check API key validity |
| `VALIDATION_ERROR` | 400, 422 | No | Fix request payload |
| `THROTTLE_ERROR` | 429 | Yes | Auto-retried with backoff |
| `SERVER_ERROR` | 5xx | Yes | Auto-retried with backoff |
| `NETWORK_ERROR` | N/A | Yes | Connection failures |
| `TIMEOUT_ERROR` | N/A | Yes | Request timed out |
| `CIRCUIT_OPEN` | N/A | No | Wait for circuit reset |

## Circuit Breaker

```typescript
const state = sdk.getCircuitState(); // 'closed' | 'open' | 'half-open'
```

The circuit opens after 5 consecutive failures (configurable). Requests immediately fail with `SdkCircuitOpenError` until the reset timeout elapses, at which point a single probe request is allowed (half-open).

## Docker CI Validation

```bash
docker compose run sdk-node-ts npm test
```

## API Key Rotation

1. Generate a new key via the admin portal or API.
2. Deploy the new key alongside the old one (both valid during rotation window).
3. Update `CAAS_API_KEY` environment variable in your deployment.
4. Revoke the old key after confirming the new key is active.

## Migration Notes — Future `project_id` Requirement

Currently `project_id` is optional. In a future major version it will become **required**.
- Start passing `project_id` now to avoid breaking changes.
- If omitted, the SDK falls back to the constructor-level `projectId`.
