# CaaS Python SDK — Quickstart

## Installation

```bash
pip install caas-sdk-python
```

## Secure Configuration

```python
import os
from caas_sdk import CaasPythonSdk

sdk = CaasPythonSdk(
    gateway_base_url=os.environ["CAAS_GATEWAY_URL"],  # e.g. http://gateway:3000
    api_key=os.environ["CAAS_API_KEY"],                # Never hard-code
    project_id=os.environ.get("CAAS_PROJECT_ID"),
    timeout=10.0,
    max_retries=3,
    base_delay_s=0.3,
    max_delay_s=10.0,
    cb_failure_threshold=5,
    cb_reset_timeout_s=30.0,
)
```

> **API Key Security**: Store keys in environment variables or secrets managers. Never commit to source control.

## Usage

### Health Check

```python
health = sdk.health()
print(health)  # {"status": "ok", ...}
```

### Create Session

```python
session = sdk.create_session("user-123", project_id="proj-abc")
print(session["access_token"])
print(session["refresh_token"])
```

### Refresh Session

```python
refreshed = sdk.refresh(session["refresh_token"])
```

### Logout

```python
sdk.logout(session["access_token"])
```

## Error Handling

```python
from caas_sdk import (
    SdkError, SdkAuthError, SdkThrottleError,
    SdkServerError, SdkCircuitOpenError
)

try:
    sdk.create_session("u1")
except SdkAuthError as e:
    print(f"Auth error: {e.code}, status={e.status}")
except SdkThrottleError as e:
    print(f"Rate limited, retry after: {e.retry_after_s}s")
except SdkCircuitOpenError:
    print("Circuit breaker open — wait before retrying")
except SdkError as e:
    print(f"SDK error: {e.code}, retryable={e.retryable}")
```

| Error Code | HTTP Status | Retryable | Notes |
|---|---|---|---|
| `AUTH_ERROR` | 401, 403 | No | Check API key |
| `VALIDATION_ERROR` | 400, 422 | No | Fix payload |
| `THROTTLE_ERROR` | 429 | Yes | Auto-retried |
| `SERVER_ERROR` | 5xx | Yes | Auto-retried |
| `NETWORK_ERROR` | N/A | Yes | Connection failure |
| `TIMEOUT_ERROR` | N/A | Yes | Timed out |
| `CIRCUIT_OPEN` | N/A | No | Wait for circuit reset |

## Circuit Breaker

```python
state = sdk.circuit_state  # "closed" | "open" | "half-open"
```

## Docker CI

```bash
docker compose run sdk-python pytest
```

## API Key Rotation

1. Create a new API key in the admin portal.
2. Deploy with the new key while old key remains valid.
3. Revoke the old key after confirming functionality.

## Migration Notes — Future `project_id` Requirement

`project_id` is currently optional. It will become required in a future major version.
Start passing it now.
