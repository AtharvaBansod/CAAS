/**
 * FDB-CONN-003 — Connection Pooling & Throttling Controls
 *
 * Provider-aware connection pool manager with tenant quotas.
 * Rate-limit controls to protect external tenant-managed databases.
 * Health and saturation metrics for each pool.
 */

import { ProviderId } from '../types';

/* ─── Pool Config ─── */

export interface PoolConfig {
  provider: ProviderId;
  tenantId: string;
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxRps: number; // rate limit
}

const DEFAULT_POOL: Omit<PoolConfig, 'provider' | 'tenantId'> = {
  maxConnections: 10,
  minConnections: 1,
  acquireTimeoutMs: 5000,
  idleTimeoutMs: 60_000,
  maxRps: 200,
};

/* ─── Pool Metrics ─── */

export interface PoolMetrics {
  provider: ProviderId;
  tenantId: string;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingRequests: number;
  requestsPerSecond: number;
  throttledCount: number;
  saturationPct: number;
}

/* ─── Tenant Pool ─── */

export class TenantPool {
  readonly provider: ProviderId;
  readonly tenantId: string;
  private config: PoolConfig;
  private active = 0;
  private idle: number;
  private waiting = 0;
  private throttledCount = 0;
  private requestTimestamps: number[] = [];

  constructor(config: PoolConfig) {
    this.provider = config.provider;
    this.tenantId = config.tenantId;
    this.config = config;
    this.idle = config.minConnections;
  }

  /**
   * Acquire a connection slot. Returns true if granted.
   */
  acquire(): boolean {
    this.pruneTimestamps();

    // rate limit check
    if (this.requestTimestamps.length >= this.config.maxRps) {
      this.throttledCount++;
      return false;
    }

    if (this.active >= this.config.maxConnections) {
      this.waiting++;
      return false;
    }

    this.active++;
    if (this.idle > 0) this.idle--;
    this.requestTimestamps.push(Date.now());
    return true;
  }

  /**
   * Release a connection slot back to pool.
   */
  release(): void {
    if (this.active > 0) this.active--;
    if (this.active + this.idle < this.config.maxConnections) {
      this.idle++;
    }
    if (this.waiting > 0) this.waiting--;
  }

  getMetrics(): PoolMetrics {
    this.pruneTimestamps();
    return {
      provider: this.provider,
      tenantId: this.tenantId,
      activeConnections: this.active,
      idleConnections: this.idle,
      totalConnections: this.active + this.idle,
      waitingRequests: this.waiting,
      requestsPerSecond: this.requestTimestamps.length,
      throttledCount: this.throttledCount,
      saturationPct:
        this.config.maxConnections > 0
          ? Math.round((this.active / this.config.maxConnections) * 100)
          : 0,
    };
  }

  updateConfig(patch: Partial<Omit<PoolConfig, 'provider' | 'tenantId'>>): void {
    Object.assign(this.config, patch);
  }

  private pruneTimestamps(): void {
    const oneSecAgo = Date.now() - 1000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneSecAgo);
  }
}

/* ─── Pool Manager ─── */

export class ConnectionPoolManager {
  private pools = new Map<string, TenantPool>();

  getOrCreate(
    provider: ProviderId,
    tenantId: string,
    config?: Partial<Omit<PoolConfig, 'provider' | 'tenantId'>>,
  ): TenantPool {
    const key = poolKey(provider, tenantId);
    let pool = this.pools.get(key);
    if (!pool) {
      pool = new TenantPool({
        provider,
        tenantId,
        ...DEFAULT_POOL,
        ...config,
      });
      this.pools.set(key, pool);
    }
    return pool;
  }

  getPool(provider: ProviderId, tenantId: string): TenantPool | undefined {
    return this.pools.get(poolKey(provider, tenantId));
  }

  removePool(provider: ProviderId, tenantId: string): boolean {
    return this.pools.delete(poolKey(provider, tenantId));
  }

  getAllMetrics(): PoolMetrics[] {
    return Array.from(this.pools.values()).map((p) => p.getMetrics());
  }

  getMetricsByTenant(tenantId: string): PoolMetrics[] {
    return Array.from(this.pools.values())
      .filter((p) => p.tenantId === tenantId)
      .map((p) => p.getMetrics());
  }

  getMetricsByProvider(provider: ProviderId): PoolMetrics[] {
    return Array.from(this.pools.values())
      .filter((p) => p.provider === provider)
      .map((p) => p.getMetrics());
  }
}

function poolKey(provider: ProviderId, tenantId: string): string {
  return `${provider}::${tenantId}`;
}

/* ─── Singleton ─── */

let _pm: ConnectionPoolManager | undefined;

export function getConnectionPoolManager(): ConnectionPoolManager {
  if (!_pm) _pm = new ConnectionPoolManager();
  return _pm;
}

export function resetPoolManagerForTest(): void {
  _pm = undefined;
}
