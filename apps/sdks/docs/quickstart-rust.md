# CaaS Rust SDK — Quickstart

## Installation

```toml
# Cargo.toml
[dependencies]
caas-sdk-rust = "0.1.0-alpha.1"
```

## Secure Configuration

```rust
use caas_sdk_rust::CaasRustSdk;

let mut sdk = CaasRustSdk::new(
    &std::env::var("CAAS_GATEWAY_URL").unwrap(),
    &std::env::var("CAAS_API_KEY").unwrap(),
    std::env::var("CAAS_PROJECT_ID").ok().as_deref(),
);
```

## Usage

```rust
let health = sdk.health()?;
let session = sdk.create_session("user-123")?;
let refreshed = sdk.refresh("refresh-token-value")?;
sdk.logout("access-token-value")?;
```

## Error Handling

```rust
use caas_sdk_rust::{SdkError, SdkErrorCode};

match sdk.create_session("u1") {
    Ok(body) => println!("Session: {:?}", body),
    Err(e) => match e.code {
        SdkErrorCode::AuthError =>
            eprintln!("Auth error: {} status={:?}", e.message, e.status),
        SdkErrorCode::ThrottleError =>
            eprintln!("Rate limited, retry after {:?}s", e.retry_after_secs),
        SdkErrorCode::CircuitOpen =>
            eprintln!("Circuit open — wait before retrying"),
        _ => eprintln!("SDK error: {} retryable={}", e.code, e.retryable),
    }
}
```

| Code | Retryable | Notes |
|---|---|---|
| `AuthError` | No | Invalid key |
| `ValidationError` | No | Bad payload |
| `ThrottleError` | Yes | Auto-retried |
| `ServerError` | Yes | Auto-retried |
| `NetworkError` | Yes | Connection failure |
| `TimeoutError` | Yes | Timed out |
| `CircuitOpen` | No | Wait for reset |

## Docker CI

```bash
docker compose run sdk-rust cargo test
```

## API Key Rotation & Migration Notes

Same process — see [quickstart-node-ts.md](quickstart-node-ts.md#api-key-rotation).
