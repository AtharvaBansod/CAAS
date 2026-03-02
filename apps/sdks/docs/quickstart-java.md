# CaaS Java SDK — Quickstart

## Installation (Maven)

```xml
<dependency>
  <groupId>com.caas</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0-alpha.1</version>
</dependency>
```

## Secure Configuration

```java
import com.caas.sdk.CaasJavaSdk;

CaasJavaSdk sdk = new CaasJavaSdk(
    System.getenv("CAAS_GATEWAY_URL"),  // e.g. http://gateway:3000
    System.getenv("CAAS_API_KEY"),
    System.getenv("CAAS_PROJECT_ID")
);
```

> **API Key Security**: Use environment variables or a vault. Never embed in source.

## Usage

```java
// Health check
String health = sdk.health();

// Create session
String session = sdk.createSession("user-123");
// Returns JSON: {"access_token":"...", "refresh_token":"...", "expires_in":900, ...}

// Refresh
String refreshed = sdk.refresh(refreshToken);

// Logout
sdk.logout(accessToken);
```

## Error Handling

```java
import com.caas.sdk.CaasJavaSdk.*;

try {
    sdk.createSession("user-123");
} catch (SdkAuthException e) {
    System.err.println("Auth error: " + e.getCode() + " status=" + e.getStatus());
} catch (SdkThrottleException e) {
    System.err.println("Rate limited, retry after: " + e.getRetryAfterMs() + "ms");
} catch (SdkCircuitOpenException e) {
    System.err.println("Circuit open — wait before retrying");
} catch (SdkException e) {
    System.err.println("SDK error: " + e.getCode() + " retryable=" + e.isRetryable());
}
```

| Exception Class | Code | Retryable |
|---|---|---|
| `SdkAuthException` | `AUTH_ERROR` | No |
| `SdkValidationException` | `VALIDATION_ERROR` | No |
| `SdkThrottleException` | `THROTTLE_ERROR` | Yes |
| `SdkServerException` | `SERVER_ERROR` | Yes |
| `SdkNetworkException` | `NETWORK_ERROR` | Yes |
| `SdkTimeoutException` | `TIMEOUT_ERROR` | Yes |
| `SdkCircuitOpenException` | `CIRCUIT_OPEN` | No |

## Docker CI

```bash
docker compose run sdk-java mvn test
```

## API Key Rotation & Migration Notes

Same process as other SDKs — see [quickstart-node-ts.md](quickstart-node-ts.md#api-key-rotation).
