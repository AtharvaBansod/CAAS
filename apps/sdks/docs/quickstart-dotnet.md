# CaaS .NET SDK — Quickstart

## Installation

```bash
dotnet add package Caas.Sdk --version 0.1.0-alpha.1
```

## Secure Configuration

```csharp
using Caas.Sdk;

var sdk = new CaasDotnetSdk(
    gatewayBaseUrl: Environment.GetEnvironmentVariable("CAAS_GATEWAY_URL")!,
    apiKey: Environment.GetEnvironmentVariable("CAAS_API_KEY")!,
    projectId: Environment.GetEnvironmentVariable("CAAS_PROJECT_ID")
);
```

## Usage

```csharp
// Health
var health = await sdk.HealthAsync();

// Create session
var session = await sdk.CreateSessionAsync("user-123");

// Refresh
var refreshed = await sdk.RefreshAsync(refreshToken);

// Logout
await sdk.LogoutAsync(accessToken);
```

## Error Handling

### Error Code Reference

| Error Code | C# Exception | HTTP Status | Retryable | Notes |
|---|---|---|---|---|
| `AUTH_ERROR` | `SdkAuthException` | 401, 403 | No | Check API key validity |
| `VALIDATION_ERROR` | `SdkValidationException` | 400, 422 | No | Fix request payload |
| `THROTTLE_ERROR` | `SdkThrottleException` | 429 | Yes | Auto-retried with backoff |
| `SERVER_ERROR` | `SdkServerException` | 5xx | Yes | Auto-retried with backoff |
| `NETWORK_ERROR` | `SdkNetworkException` | N/A | Yes | Connection failures |
| `TIMEOUT_ERROR` | `SdkTimeoutException` | N/A | Yes | Request timed out |
| `CIRCUIT_OPEN` | `SdkCircuitOpenException` | N/A | No | Wait for circuit reset |

### Example

```csharp
try {
    await sdk.CreateSessionAsync("u1");
} catch (SdkAuthException e) {
    Console.Error.WriteLine($"Auth: {e.Code} {e.StatusCode}");
} catch (SdkThrottleException e) {
    Console.Error.WriteLine($"Rate limited, retry after: {e.RetryAfterMs}ms");
} catch (SdkCircuitOpenException) {
    Console.Error.WriteLine("Circuit open");
} catch (SdkException e) {
    Console.Error.WriteLine($"SDK: {e.Code} retryable={e.Retryable}");
}
```

## Docker CI

```bash
docker compose run sdk-dotnet dotnet test
```

## API Key Rotation & Migration Notes

Same process — see [quickstart-node-ts.md](quickstart-node-ts.md#api-key-rotation).
