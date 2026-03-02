// CaaS .NET Backend SDK — Hardened
// SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Caas.Sdk;

// ═══════ Error Hierarchy ═══════

public class SdkException : Exception
{
    public string Code { get; }
    public int? StatusCode { get; }
    public bool Retryable { get; }
    public SdkException(string message, string code, int? statusCode, bool retryable)
        : base(message) { Code = code; StatusCode = statusCode; Retryable = retryable; }
}
public class SdkNetworkException : SdkException
{
    public SdkNetworkException(string message)
        : base(message, "NETWORK_ERROR", null, true) { }
}
public class SdkTimeoutException : SdkException
{
    public long TimeoutMs { get; }
    public SdkTimeoutException(string message, long timeoutMs)
        : base(message, "TIMEOUT_ERROR", null, true) { TimeoutMs = timeoutMs; }
}
public class SdkAuthException : SdkException
{
    public SdkAuthException(string message, int status)
        : base(message, "AUTH_ERROR", status, false) { }
}
public class SdkValidationException : SdkException
{
    public SdkValidationException(string message, int status)
        : base(message, "VALIDATION_ERROR", status, false) { }
}
public class SdkThrottleException : SdkException
{
    public long? RetryAfterMs { get; }
    public SdkThrottleException(string message, long? retryAfterMs = null)
        : base(message, "THROTTLE_ERROR", 429, true) { RetryAfterMs = retryAfterMs; }
}
public class SdkServerException : SdkException
{
    public SdkServerException(string message, int status)
        : base(message, "SERVER_ERROR", status, true) { }
}
public class SdkCircuitOpenException : SdkException
{
    public SdkCircuitOpenException(long resetMs)
        : base("Circuit breaker is open — requests blocked", "CIRCUIT_OPEN", null, false) { }
}

// ═══════ Circuit Breaker ═══════

public sealed class CircuitBreaker
{
    private string _state = "closed";
    private int _failures;
    private long _lastFailureTime;
    private readonly int _threshold;
    private readonly long _resetMs;

    public CircuitBreaker(int threshold = 5, long resetMs = 30000)
    {
        _threshold = threshold;
        _resetMs = resetMs;
    }

    public string State
    {
        get
        {
            if (_state == "open" && DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - _lastFailureTime >= _resetMs)
                _state = "half-open";
            return _state;
        }
    }

    public void RecordSuccess() { _failures = 0; _state = "closed"; }

    public void RecordFailure()
    {
        _failures++;
        _lastFailureTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (_failures >= _threshold) _state = "open";
    }

    public bool AllowRequest() => State is "closed" or "half-open";
}

// ═══════ Main SDK ═══════

public sealed class CaasDotnetSdk
{
    public string GatewayBaseUrl { get; }
    public string ApiKey { get; }
    public string? ProjectId { get; }

    private readonly HttpClient _http;
    private readonly int _timeoutMs;
    private readonly int _maxRetries;
    private readonly int _baseDelayMs;
    private readonly int _maxDelayMs;
    private readonly HashSet<int> _retryableStatuses = new() { 429, 500, 502, 503, 504 };
    private readonly CircuitBreaker _cb;
    private readonly Random _rng = new();

    public CaasDotnetSdk(string gatewayBaseUrl, string apiKey, string? projectId = null,
        int timeoutMs = 10000, int maxRetries = 3, int baseDelayMs = 300, int maxDelayMs = 10000,
        int cbThreshold = 5, long cbResetMs = 30000)
    {
        GatewayBaseUrl = gatewayBaseUrl;
        ApiKey = apiKey;
        ProjectId = projectId;
        _timeoutMs = timeoutMs;
        _maxRetries = maxRetries;
        _baseDelayMs = baseDelayMs;
        _maxDelayMs = maxDelayMs;
        _http = new HttpClient { Timeout = TimeSpan.FromMilliseconds(timeoutMs) };
        _cb = new CircuitBreaker(cbThreshold, cbResetMs);
    }

    public string CircuitState => _cb.State;

    public Dictionary<string, string> CanonicalHeaders()
    {
        var headers = new Dictionary<string, string>
        {
            ["x-api-key"] = ApiKey,
            ["x-correlation-id"] = $"sdkdotnet_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}"
        };
        if (!string.IsNullOrWhiteSpace(ProjectId))
            headers["x-project-id"] = ProjectId!;
        return headers;
    }

    private SdkException ClassifyHttp(int status, string body, string? retryAfter)
    {
        if (status is 401 or 403) return new SdkAuthException($"Auth failed ({status})", status);
        if (status is 400 or 422) return new SdkValidationException($"Validation error ({status})", status);
        if (status == 429)
        {
            long? ms = retryAfter != null ? long.Parse(retryAfter) * 1000 : null;
            return new SdkThrottleException("Rate limited (429)", ms);
        }
        if (status >= 500) return new SdkServerException($"Server error ({status})", status);
        return new SdkException($"Request failed ({status})", "UNKNOWN_ERROR", status, false);
    }

    private async Task<string?> RequestAsync(HttpMethod method, string path, string? jsonBody,
        Dictionary<string, string>? headers, bool idempotent = false)
    {
        if (!_cb.AllowRequest())
            throw new SdkCircuitOpenException(_maxDelayMs);

        bool hasIdemKey = headers?.ContainsKey("idempotency-key") ?? false;
        bool nonIdempotent = method == HttpMethod.Post || method.Method == "PATCH";
        bool canRetry = idempotent || !nonIdempotent || hasIdemKey;
        int maxAttempts = canRetry ? _maxRetries + 1 : 1;
        SdkException? lastErr = null;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            try
            {
                using var req = new HttpRequestMessage(method, $"{GatewayBaseUrl}{path}");
                if (jsonBody != null)
                    req.Content = new StringContent(jsonBody, System.Text.Encoding.UTF8, "application/json");
                if (headers != null)
                    foreach (var (k, v) in headers)
                    {
                        if (k == "content-type") continue; // set via content
                        req.Headers.TryAddWithoutValidation(k, v);
                    }

                using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(_timeoutMs));
                var response = await _http.SendAsync(req, cts.Token);
                int status = (int)response.StatusCode;

                if (status >= 200 && status < 400)
                {
                    _cb.RecordSuccess();
                    if (status == 204) return null;
                    return await response.Content.ReadAsStringAsync();
                }

                string body = await response.Content.ReadAsStringAsync();
                string? retryAfter = response.Headers.Contains("Retry-After")
                    ? response.Headers.GetValues("Retry-After").FirstOrDefault() : null;
                var err = ClassifyHttp(status, body, retryAfter);

                if (!err.Retryable || !_retryableStatuses.Contains(status))
                {
                    _cb.RecordFailure();
                    throw err;
                }
                lastErr = err;

                if (err is SdkThrottleException throttle && throttle.RetryAfterMs.HasValue)
                {
                    await Task.Delay((int)throttle.RetryAfterMs.Value);
                    continue;
                }
            }
            catch (SdkException e) when (e.Retryable)
            {
                lastErr = e;
            }
            catch (SdkException) { throw; }
            catch (TaskCanceledException)
            {
                lastErr = new SdkTimeoutException($"Timeout on {path}", _timeoutMs);
                if (!canRetry) { _cb.RecordFailure(); throw lastErr; }
            }
            catch (HttpRequestException ex)
            {
                lastErr = new SdkNetworkException($"Network error: {ex.Message}");
                if (!canRetry) { _cb.RecordFailure(); throw lastErr; }
            }

            if (attempt < maxAttempts - 1)
            {
                double delay = Math.Min(
                    _baseDelayMs * Math.Pow(2, attempt) * (0.5 + _rng.NextDouble()),
                    _maxDelayMs);
                await Task.Delay((int)delay);
            }
        }

        _cb.RecordFailure();
        throw lastErr ?? new SdkException("Request failed after retries", "UNKNOWN_ERROR", null, false);
    }

    // ── Public API (async) ──

    public Task<string?> HealthAsync() =>
        RequestAsync(HttpMethod.Get, "/api/v1/sdk/health",
            null, new Dictionary<string, string>(CanonicalHeaders()) { ["content-type"] = "application/json" }, true);

    public Task<string?> CapabilitiesAsync() =>
        RequestAsync(HttpMethod.Get, "/api/v1/sdk/capabilities",
            null, new Dictionary<string, string>(CanonicalHeaders()) { ["content-type"] = "application/json" }, true);

    public Task<string?> CreateSessionAsync(string userExternalId)
    {
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var body = JsonSerializer.Serialize(new { user_external_id = userExternalId, project_id = ProjectId ?? "" });
        var headers = new Dictionary<string, string>(CanonicalHeaders())
        {
            ["content-type"] = "application/json",
            ["idempotency-key"] = $"idem_{now}",
            ["x-timestamp"] = $"{now / 1000}",
            ["x-nonce"] = $"n_{now}"
        };
        return RequestAsync(HttpMethod.Post, "/api/v1/sdk/session", body, headers);
    }

    public Task<string?> RefreshAsync(string refreshToken)
    {
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var body = JsonSerializer.Serialize(new { refresh_token = refreshToken });
        var headers = new Dictionary<string, string>
        {
            ["content-type"] = "application/json",
            ["x-correlation-id"] = $"sdkdotnet_{now}",
            ["idempotency-key"] = $"idem_ref_{now}"
        };
        return RequestAsync(HttpMethod.Post, "/api/v1/sdk/refresh", body, headers);
    }

    public Task<string?> LogoutAsync(string accessToken)
    {
        long now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var headers = new Dictionary<string, string>
        {
            ["authorization"] = $"Bearer {accessToken}",
            ["x-correlation-id"] = $"sdkdotnet_{now}",
            ["idempotency-key"] = $"idem_logout_{now}"
        };
        return RequestAsync(HttpMethod.Post, "/api/v1/sdk/logout", null, headers);
    }
}
