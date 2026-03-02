// ─────────────────────────────────────────────────────────
// @caas/sdk-node-ts — Hardened Backend SDK
// SDKBE-REL-001: Typed Error Hierarchy, Retry/Backoff, Circuit Breaker
// ─────────────────────────────────────────────────────────

/* ═══════ 1. Types & Interfaces ═══════ */

export interface SessionCreatePayload {
  user_external_id: string;
  project_id?: string;
  user_data?: Record<string, unknown>;
}

export interface SessionTokenBundle {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
  retryOnNetworkError?: boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
}

export interface SdkNodeOptions {
  gatewayBaseUrl: string;
  apiKey: string;
  projectId?: string;
  fetchImpl?: typeof fetch;
  defaultTimeoutMs?: number;
  retry?: RetryOptions;
  circuitBreaker?: CircuitBreakerOptions;
}

/* ═══════ 2. Typed Error Hierarchy ═══════ */

export type SdkErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'THROTTLE_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'CIRCUIT_OPEN'
  | 'UNKNOWN_ERROR';

export class SdkError extends Error {
  constructor(
    message: string,
    public readonly code: SdkErrorCode,
    public readonly status: number | undefined,
    public readonly retryable: boolean,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SdkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SdkNetworkError extends SdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', undefined, true, details);
    this.name = 'SdkNetworkError';
  }
}

export class SdkTimeoutError extends SdkError {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message, 'TIMEOUT_ERROR', undefined, true, { timeoutMs });
    this.name = 'SdkTimeoutError';
  }
}

export class SdkAuthError extends SdkError {
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', status, false, details);
    this.name = 'SdkAuthError';
  }
}

export class SdkValidationError extends SdkError {
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', status, false, details);
    this.name = 'SdkValidationError';
  }
}

export class SdkThrottleError extends SdkError {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message, 'THROTTLE_ERROR', 429, true, { retryAfterMs });
    this.name = 'SdkThrottleError';
  }
}

export class SdkServerError extends SdkError {
  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message, 'SERVER_ERROR', status, true, details);
    this.name = 'SdkServerError';
  }
}

export class SdkCircuitOpenError extends SdkError {
  constructor(resetAfterMs: number) {
    super('Circuit breaker is open — requests blocked', 'CIRCUIT_OPEN', undefined, false, { resetAfterMs });
    this.name = 'SdkCircuitOpenError';
  }
}

/* ═══════ 3. Circuit Breaker ═══════ */

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.threshold = opts.failureThreshold ?? 5;
    this.resetMs = opts.resetTimeoutMs ?? 30_000;
  }

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() - this.lastFailureTime >= this.resetMs) {
      this.state = 'half-open';
    }
    return this.state;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) this.state = 'open';
  }

  allowRequest(): boolean {
    const s = this.getState();
    return s === 'closed' || s === 'half-open';
  }
}

/* ═══════ 4. Helpers ═══════ */

function withTimeout(signal: AbortSignal | null | undefined, timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return ctrl.signal;
}

function jitter(base: number): number {
  return base * (0.5 + Math.random());
}

function classifyHttpError(status: number, body: string, retryAfterHeader?: string | null): SdkError {
  let parsed: Record<string, unknown> | undefined;
  try { parsed = JSON.parse(body); } catch { /* not json */ }
  const details = { responseBody: body.slice(0, 500), ...(parsed && typeof parsed === 'object' ? parsed : {}) };

  if (status === 401 || status === 403) return new SdkAuthError(`Auth failed (${status})`, status, details);
  if (status === 400 || status === 422) return new SdkValidationError(`Validation error (${status})`, status, details);
  if (status === 429) {
    const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;
    return new SdkThrottleError('Rate limited (429)', retryAfterMs);
  }
  if (status === 404) return new SdkError('Not found (404)', 'NOT_FOUND_ERROR', 404, false, details);
  if (status >= 500) return new SdkServerError(`Server error (${status})`, status, details);
  return new SdkError(`Request failed (${status})`, 'UNKNOWN_ERROR', status, false, details);
}

const DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];
const NON_IDEMPOTENT = new Set(['POST', 'PATCH']);

/* ═══════ 5. SDK Class ═══════ */

export class CaasNodeSdk {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retryConfig: Required<RetryOptions>;
  private readonly cb: CircuitBreaker;

  constructor(private readonly options: SdkNodeOptions) {
    this.fetchImpl = options.fetchImpl || fetch;
    this.timeoutMs = options.defaultTimeoutMs || 10_000;
    this.retryConfig = {
      maxRetries: options.retry?.maxRetries ?? 3,
      baseDelayMs: options.retry?.baseDelayMs ?? 300,
      maxDelayMs: options.retry?.maxDelayMs ?? 10_000,
      retryableStatuses: options.retry?.retryableStatuses ?? DEFAULT_RETRYABLE,
      retryOnNetworkError: options.retry?.retryOnNetworkError ?? true,
    };
    this.cb = new CircuitBreaker(options.circuitBreaker);
  }

  getCircuitState() { return this.cb.getState(); }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      'content-type': 'application/json',
      'x-api-key': this.options.apiKey,
      'x-correlation-id': `sdknode_${Date.now()}`,
      ...(this.options.projectId ? { 'x-project-id': this.options.projectId } : {}),
      ...(extra || {}),
    };
  }

  /**
   * Core request method: circuit breaker → retry with exponential backoff + jitter.
   * Non-idempotent requests (POST/PATCH without idempotency-key) are NEVER retried.
   */
  private async request<T>(path: string, init: RequestInit, idempotent = false): Promise<T> {
    if (!this.cb.allowRequest()) {
      throw new SdkCircuitOpenError(this.retryConfig.maxDelayMs);
    }

    const method = (init.method || 'GET').toUpperCase();
    const hdrs = init.headers as Record<string, string> | undefined;
    const hasIdemKey = !!hdrs?.['idempotency-key'];
    const canRetry = idempotent || !NON_IDEMPOTENT.has(method) || hasIdemKey;
    const maxAttempts = canRetry ? this.retryConfig.maxRetries + 1 : 1;
    let lastErr: SdkError | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const res = await this.fetchImpl(`${this.options.gatewayBaseUrl}${path}`, {
          ...init,
          signal: withTimeout(init.signal, this.timeoutMs),
        });

        if (res.ok) {
          this.cb.recordSuccess();
          if (res.status === 204) return undefined as T;
          return res.json() as Promise<T>;
        }

        const body = await res.text();
        const retryAfter = res.headers?.get?.('retry-after');
        const err = classifyHttpError(res.status, body, retryAfter);

        if (!err.retryable || !this.retryConfig.retryableStatuses.includes(res.status)) {
          this.cb.recordFailure();
          throw err;
        }
        lastErr = err;

        if (err instanceof SdkThrottleError && err.retryAfterMs) {
          await this.sleep(err.retryAfterMs);
          continue;
        }
      } catch (error) {
        if (error instanceof SdkError) {
          if (!error.retryable) { this.cb.recordFailure(); throw error; }
          lastErr = error;
        } else {
          const isAbort = (error as Error)?.name === 'AbortError';
          const netErr = isAbort
            ? new SdkTimeoutError(`Request to ${path} timed out (${this.timeoutMs}ms)`, this.timeoutMs)
            : new SdkNetworkError(`Network error: ${(error as Error)?.message || error}`, { cause: (error as Error)?.message });
          lastErr = netErr;
          if (!canRetry || !this.retryConfig.retryOnNetworkError) { this.cb.recordFailure(); throw netErr; }
        }
      }

      if (attempt < maxAttempts - 1) {
        await this.sleep(Math.min(jitter(this.retryConfig.baseDelayMs * 2 ** attempt), this.retryConfig.maxDelayMs));
      }
    }

    this.cb.recordFailure();
    throw lastErr || new SdkError('Request failed after retries', 'UNKNOWN_ERROR', undefined, false);
  }

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

  /* ── Public API ── */

  health() {
    return this.request<Record<string, unknown>>('/api/v1/sdk/health', {
      method: 'GET', headers: this.headers(),
    }, true);
  }

  capabilities() {
    return this.request<Record<string, unknown>>('/api/v1/sdk/capabilities', {
      method: 'GET', headers: this.headers(),
    }, true);
  }

  createSession(payload: SessionCreatePayload) {
    return this.request<SessionTokenBundle>('/api/v1/sdk/session', {
      method: 'POST',
      headers: this.headers({
        'idempotency-key': `idem_${Date.now()}`,
        'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
        'x-nonce': `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      }),
      body: JSON.stringify({
        ...payload,
        ...(payload.project_id ? {} : this.options.projectId ? { project_id: this.options.projectId } : {}),
      }),
    });
  }

  refresh(refreshToken: string) {
    return this.request<SessionTokenBundle>('/api/v1/sdk/refresh', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': `sdknode_${Date.now()}`,
        'idempotency-key': `idem_ref_${Date.now()}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  logout(accessToken: string) {
    return this.request<Record<string, unknown>>('/api/v1/sdk/logout', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-correlation-id': `sdknode_${Date.now()}`,
        'idempotency-key': `idem_logout_${Date.now()}`,
      },
    });
  }
}
