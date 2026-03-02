# CaaS Ruby SDK — Quickstart

## Installation

```ruby
# Gemfile
gem 'caas_sdk'
```

## Secure Configuration

```ruby
require 'caas_sdk'

client = CaasSdk::Client.new(
  gateway_base_url: ENV['CAAS_GATEWAY_URL'],
  api_key: ENV['CAAS_API_KEY'],
  project_id: ENV['CAAS_PROJECT_ID'],
  timeout: 10,
  max_retries: 3,
  cb_threshold: 5
)
```

## Usage

```ruby
health = client.health
session = client.create_session('user-123', project_id: 'proj-abc')
refreshed = client.refresh(session['refresh_token'])
client.logout(session['access_token'])
```

## Error Handling

### Error Code Reference

| Error Code | Ruby Exception | HTTP Status | Retryable | Notes |
|---|---|---|---|---|
| `AUTH_ERROR` | `SdkAuthError` | 401, 403 | No | Check API key validity |
| `VALIDATION_ERROR` | `SdkValidationError` | 400, 422 | No | Fix request payload |
| `THROTTLE_ERROR` | `SdkThrottleError` | 429 | Yes | Auto-retried with backoff |
| `SERVER_ERROR` | `SdkServerError` | 5xx | Yes | Auto-retried with backoff |
| `NETWORK_ERROR` | `SdkNetworkError` | N/A | Yes | Connection failures |
| `TIMEOUT_ERROR` | `SdkTimeoutError` | N/A | Yes | Request timed out |
| `CIRCUIT_OPEN` | `SdkCircuitOpenError` | N/A | No | Wait for circuit reset |

### Example

```ruby
begin
  client.create_session('u1')
rescue CaasSdk::SdkAuthError => e
  puts "Auth: #{e.code} #{e.status}"
rescue CaasSdk::SdkThrottleError => e
  puts "Rate limited, retry after: #{e.retry_after_s}s"
rescue CaasSdk::SdkCircuitOpenError
  puts "Circuit open"
rescue CaasSdk::SdkError => e
  puts "SDK: #{e.code} retryable=#{e.retryable}"
end
```

## Docker CI

```bash
docker compose run sdk-ruby ruby -Itest test/client_test.rb
```

## API Key Rotation & Migration Notes

Same process — see [quickstart-node-ts.md](quickstart-node-ts.md#api-key-rotation).
