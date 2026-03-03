/**
 * FDB-ABS-003 — Fallback And Circuit-Breaker Controls
 *
 * Provider health probes with fail-open / fail-closed policy.
 * Controlled fallback to internal MongoDB for approved workloads.
 * Replay queue for failed writes.
 */

import { ProviderId, ProviderHealthStatus, ProviderHealthReport, EntityDomain } from '../types';
import { CircuitOpenError } from '../errors';

/* ─── Circuit Breaker per provider ─── */

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_CB_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 2,
};

export type CircuitState = 'closed' | 'open' | 'half_open';

export class ProviderCircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;
  public readonly provider: ProviderId;

  constructor(provider: ProviderId, config?: Partial<CircuitBreakerConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_CB_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = 'half_open';
        this.successes = 0;
      }
    }
    return this.state;
  }

  allowRequest(): boolean {
    const s = this.getState();
    return s === 'closed' || s === 'half_open';
  }

  recordSuccess(): void {
    if (this.state === 'half_open') {
      this.successes++;
      if (this.successes >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
      }
    } else if (this.state === 'closed') {
      this.failures = 0;
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half_open') {
      this.state = 'open';
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }
}

/* ─── Fallback Policy ─── */

export type FailPolicy = 'fail_open' | 'fail_closed';

export interface FallbackRule {
  domain: EntityDomain;
  failPolicy: FailPolicy;
  fallbackProvider: ProviderId;
}

/* ─── Replay Queue (in-memory for now) ─── */

export interface ReplayEntry {
  id: string;
  tenantId: string;
  domain: EntityDomain;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  originalProvider: ProviderId;
  failedAt: string;
  retryCount: number;
}

/* ─── Fallback Controller ─── */

export class FallbackController {
  private breakers = new Map<ProviderId, ProviderCircuitBreaker>();
  private fallbackRules: FallbackRule[] = [];
  private replayQueue: ReplayEntry[] = [];
  private healthCache = new Map<ProviderId, ProviderHealthReport>();

  getOrCreateBreaker(
    provider: ProviderId,
    config?: Partial<CircuitBreakerConfig>,
  ): ProviderCircuitBreaker {
    let cb = this.breakers.get(provider);
    if (!cb) {
      cb = new ProviderCircuitBreaker(provider, config);
      this.breakers.set(provider, cb);
    }
    return cb;
  }

  getBreaker(provider: ProviderId): ProviderCircuitBreaker | undefined {
    return this.breakers.get(provider);
  }

  addFallbackRule(rule: FallbackRule): void {
    this.fallbackRules.push(rule);
  }

  /**
   * Determine whether to fallback or throw, given provider + domain.
   * Returns the target provider to use.
   */
  resolveFallback(provider: ProviderId, domain: EntityDomain): ProviderId {
    const cb = this.breakers.get(provider);
    if (cb && !cb.allowRequest()) {
      // CB is open — check if we have a fallback rule
      const rule = this.fallbackRules.find((r) => r.domain === domain);
      if (rule && rule.failPolicy === 'fail_open') {
        return rule.fallbackProvider;
      }
      throw new CircuitOpenError(provider);
    }
    return provider;
  }

  /* ── health probes ── */

  updateHealth(report: ProviderHealthReport): void {
    this.healthCache.set(report.provider, report);
  }

  getHealth(provider: ProviderId): ProviderHealthReport | undefined {
    return this.healthCache.get(provider);
  }

  getAllHealth(): ProviderHealthReport[] {
    return Array.from(this.healthCache.values());
  }

  /* ── replay queue ── */

  enqueueReplay(entry: ReplayEntry): void {
    this.replayQueue.push(entry);
  }

  dequeueReplay(maxItems = 10): ReplayEntry[] {
    return this.replayQueue.splice(0, maxItems);
  }

  replayQueueSize(): number {
    return this.replayQueue.length;
  }

  getReplayQueue(): ReplayEntry[] {
    return [...this.replayQueue];
  }
}

/* ─── Singleton ─── */

let _fallback: FallbackController | undefined;

export function getFallbackController(): FallbackController {
  if (!_fallback) _fallback = new FallbackController();
  return _fallback;
}

export function resetFallbackForTest(): void {
  _fallback = undefined;
}
