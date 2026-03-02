package com.caas.sdk;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/**
 * CaaS Java Backend SDK — Hardened
 * SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker
 */
public class CaasJavaSdk {
    private final String gatewayBaseUrl;
    private final String apiKey;
    private final String projectId;
    private final HttpClient client;
    private final Duration timeout;
    private final int maxRetries;
    private final long baseDelayMs;
    private final long maxDelayMs;
    private final Set<Integer> retryableStatuses;
    private final boolean retryOnNetworkError;

    // Circuit breaker state (synchronized for thread safety)
    private final Object cbLock = new Object();
    private String cbState = "closed";
    private int cbFailures = 0;
    private long cbLastFailureTime = 0;
    private final int cbThreshold;
    private final long cbResetMs;

    public CaasJavaSdk(String gatewayBaseUrl, String apiKey, String projectId) {
        this(gatewayBaseUrl, apiKey, projectId, 10000, 3, 300, 10000, 5, 30000);
    }

    public CaasJavaSdk(String gatewayBaseUrl, String apiKey, String projectId,
                        long timeoutMs, int maxRetries, long baseDelayMs, long maxDelayMs,
                        int cbThreshold, long cbResetMs) {
        this.gatewayBaseUrl = gatewayBaseUrl;
        this.apiKey = apiKey;
        this.projectId = projectId;
        this.client = HttpClient.newHttpClient();
        this.timeout = Duration.ofMillis(timeoutMs);
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
        this.maxDelayMs = maxDelayMs;
        this.retryableStatuses = Set.of(429, 500, 502, 503, 504);
        this.retryOnNetworkError = true;
        this.cbThreshold = cbThreshold;
        this.cbResetMs = cbResetMs;
    }

    // ── Circuit breaker (thread-safe) ──
    public String getCircuitState() {
        synchronized (cbLock) {
            if ("open".equals(cbState) && (System.currentTimeMillis() - cbLastFailureTime) >= cbResetMs) {
                cbState = "half-open";
            }
            return cbState;
        }
    }

    private void recordSuccess() {
        synchronized (cbLock) {
            cbFailures = 0;
            cbState = "closed";
        }
    }

    private void recordFailure() {
        synchronized (cbLock) {
            cbFailures++;
            cbLastFailureTime = System.currentTimeMillis();
            if (cbFailures >= cbThreshold) cbState = "open";
        }
    }

    private boolean allowRequest() {
        String s = getCircuitState();
        return "closed".equals(s) || "half-open".equals(s);
    }

    // ── Headers ──
    public Map<String, String> canonicalHeaders() {
        return Map.of(
            "x-api-key", apiKey,
            "x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli(),
            "x-project-id", projectId == null ? "" : projectId
        );
    }

    // ── Classification ──
    private SdkException classifyHttpError(int status, String body, String retryAfter) {
        if (status == 401 || status == 403)
            return new SdkAuthException("Auth failed (" + status + ")", status);
        if (status == 400 || status == 422)
            return new SdkValidationException("Validation error (" + status + ")", status);
        if (status == 429) {
            Long retryMs = retryAfter != null ? Long.parseLong(retryAfter) * 1000 : null;
            return new SdkThrottleException("Rate limited (429)", retryMs);
        }
        if (status >= 500)
            return new SdkServerException("Server error (" + status + ")", status);
        return new SdkException("Request failed (" + status + ")", "UNKNOWN_ERROR", status, false);
    }

    // ── Core request with retry + circuit breaker ──
    private String request(String method, String path, String jsonBody, Map<String, String> headers, boolean idempotent)
            throws SdkException {
        if (!allowRequest()) {
            throw new SdkCircuitOpenException(cbResetMs);
        }
        boolean hasIdemKey = headers != null && headers.containsKey("idempotency-key");
        boolean nonIdempotentMethod = "POST".equals(method) || "PATCH".equals(method);
        boolean canRetry = idempotent || !nonIdempotentMethod || hasIdemKey;
        int maxAttempts = canRetry ? maxRetries + 1 : 1;
        SdkException lastErr = null;

        for (int attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                HttpRequest.Builder rb = HttpRequest.newBuilder()
                    .uri(URI.create(gatewayBaseUrl + path))
                    .timeout(timeout);

                if ("POST".equals(method)) {
                    rb.POST(jsonBody != null
                        ? HttpRequest.BodyPublishers.ofString(jsonBody)
                        : HttpRequest.BodyPublishers.noBody());
                } else {
                    rb.GET();
                }

                if (headers != null) {
                    for (var entry : headers.entrySet()) {
                        rb.header(entry.getKey(), entry.getValue());
                    }
                }

                HttpResponse<String> response = client.send(rb.build(), HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status >= 200 && status < 400) {
                    recordSuccess();
                    return status == 204 ? null : response.body();
                }

                String retryAfterVal = response.headers().firstValue("retry-after").orElse(null);
                SdkException err = classifyHttpError(status, response.body(), retryAfterVal);

                if (!err.isRetryable() || !retryableStatuses.contains(status)) {
                    recordFailure();
                    throw err;
                }
                lastErr = err;

                if (err instanceof SdkThrottleException throttle && throttle.getRetryAfterMs() != null) {
                    Thread.sleep(throttle.getRetryAfterMs());
                    continue;
                }
            } catch (SdkException e) {
                if (!e.isRetryable()) { recordFailure(); throw e; }
                lastErr = e;
            } catch (java.net.http.HttpTimeoutException e) {
                lastErr = new SdkTimeoutException("Timeout on " + path, timeout.toMillis());
                if (!canRetry) { recordFailure(); throw lastErr; }
            } catch (IOException | InterruptedException e) {
                lastErr = new SdkNetworkException("Network error: " + e.getMessage());
                if (!canRetry || !retryOnNetworkError) { recordFailure(); throw lastErr; }
            }

            if (attempt < maxAttempts - 1) {
                try {
                    long delay = Math.min(
                        (long)(baseDelayMs * Math.pow(2, attempt) * (0.5 + ThreadLocalRandom.current().nextDouble())),
                        maxDelayMs
                    );
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new SdkNetworkException("Interrupted during backoff");
                }
            }
        }
        recordFailure();
        throw lastErr != null ? lastErr : new SdkException("Request failed after retries", "UNKNOWN_ERROR", null, false);
    }

    // ── Public API ──
    public int healthStatus() throws SdkException {
        request("GET", "/api/v1/sdk/health", null,
            Map.of("x-api-key", apiKey, "x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli(),
                    "content-type", "application/json"),
            true);
        return 200;
    }

    public String health() throws SdkException {
        return request("GET", "/api/v1/sdk/health", null,
            Map.of("x-api-key", apiKey, "x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli(),
                    "content-type", "application/json"),
            true);
    }

    public String capabilities() throws SdkException {
        return request("GET", "/api/v1/sdk/capabilities", null,
            Map.of("x-api-key", apiKey, "x-correlation-id", "sdkjava_" + Instant.now().toEpochMilli(),
                    "content-type", "application/json"),
            true);
    }

    public String createSession(String userExternalId) throws SdkException {
        long now = Instant.now().toEpochMilli();
        String body = "{\"user_external_id\":\"" + userExternalId + "\""
            + (projectId != null ? ",\"project_id\":\"" + projectId + "\"" : "")
            + "}";
        return request("POST", "/api/v1/sdk/session", body,
            Map.of(
                "content-type", "application/json",
                "x-api-key", apiKey,
                "x-correlation-id", "sdkjava_" + now,
                "idempotency-key", "idem_" + now,
                "x-timestamp", String.valueOf(now / 1000),
                "x-nonce", "n_" + now
            ), false);
    }

    public String refresh(String refreshToken) throws SdkException {
        long now = Instant.now().toEpochMilli();
        String body = "{\"refresh_token\":\"" + refreshToken + "\"}";
        return request("POST", "/api/v1/sdk/refresh", body,
            Map.of(
                "content-type", "application/json",
                "x-correlation-id", "sdkjava_" + now,
                "idempotency-key", "idem_ref_" + now
            ), false);
    }

    public String logout(String accessToken) throws SdkException {
        long now = Instant.now().toEpochMilli();
        return request("POST", "/api/v1/sdk/logout", null,
            Map.of(
                "authorization", "Bearer " + accessToken,
                "x-correlation-id", "sdkjava_" + now,
                "idempotency-key", "idem_logout_" + now
            ), false);
    }

    // ═══ Error Hierarchy ═══
    public static class SdkException extends Exception {
        private final String code;
        private final Integer status;
        private final boolean retryable;

        public SdkException(String message, String code, Integer status, boolean retryable) {
            super(message);
            this.code = code;
            this.status = status;
            this.retryable = retryable;
        }

        public String getCode() { return code; }
        public Integer getStatus() { return status; }
        public boolean isRetryable() { return retryable; }
    }

    public static class SdkNetworkException extends SdkException {
        public SdkNetworkException(String message) {
            super(message, "NETWORK_ERROR", null, true);
        }
    }

    public static class SdkTimeoutException extends SdkException {
        public SdkTimeoutException(String message, long timeoutMs) {
            super(message, "TIMEOUT_ERROR", null, true);
        }
    }

    public static class SdkAuthException extends SdkException {
        public SdkAuthException(String message, int status) {
            super(message, "AUTH_ERROR", status, false);
        }
    }

    public static class SdkValidationException extends SdkException {
        public SdkValidationException(String message, int status) {
            super(message, "VALIDATION_ERROR", status, false);
        }
    }

    public static class SdkThrottleException extends SdkException {
        private final Long retryAfterMs;
        public SdkThrottleException(String message, Long retryAfterMs) {
            super(message, "THROTTLE_ERROR", 429, true);
            this.retryAfterMs = retryAfterMs;
        }
        public Long getRetryAfterMs() { return retryAfterMs; }
    }

    public static class SdkServerException extends SdkException {
        public SdkServerException(String message, int status) {
            super(message, "SERVER_ERROR", status, true);
        }
    }

    public static class SdkCircuitOpenException extends SdkException {
        public SdkCircuitOpenException(long resetMs) {
            super("Circuit breaker is open", "CIRCUIT_OPEN", null, false);
        }
    }
}
