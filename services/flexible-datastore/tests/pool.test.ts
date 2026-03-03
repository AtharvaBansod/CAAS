/**
 * Tests for FDB-CONN-003: Connection Pool Manager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getConnectionPoolManager, resetPoolManagerForTest } from '../src/pool';

describe('Connection Pool Manager', () => {
  beforeEach(() => resetPoolManagerForTest());

  it('should create a pool and acquire/release', () => {
    const pm = getConnectionPoolManager();
    const pool = pm.getOrCreate('mongodb', 't1');
    expect(pool.acquire()).toBe(true);
    pool.release();
  });

  it('should reuse existing pool for same tenant+provider', () => {
    const pm = getConnectionPoolManager();
    const pool1 = pm.getOrCreate('mongodb', 't1');
    const pool2 = pm.getOrCreate('mongodb', 't1');
    expect(pool1).toBe(pool2);
  });

  it('should report pool metrics', () => {
    const pm = getConnectionPoolManager();
    pm.getOrCreate('mongodb', 't1');
    const metrics = pm.getAllMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(1);
    expect(metrics[0].tenantId).toBe('t1');
    expect(metrics[0].provider).toBe('mongodb');
  });

  it('should filter metrics by tenant', () => {
    const pm = getConnectionPoolManager();
    pm.getOrCreate('mongodb', 't1');
    pm.getOrCreate('dynamodb', 't2');
    const t1m = pm.getMetricsByTenant('t1');
    expect(t1m.length).toBe(1);
  });

  it('should filter metrics by provider', () => {
    const pm = getConnectionPoolManager();
    pm.getOrCreate('mongodb', 't1');
    pm.getOrCreate('mongodb', 't2');
    const mdbMetrics = pm.getMetricsByProvider('mongodb');
    expect(mdbMetrics.length).toBe(2);
  });

  it('should reject acquire when pool exhausted (maxConnections)', () => {
    const pm = getConnectionPoolManager();
    const pool = pm.getOrCreate('mongodb', 't1', { maxConnections: 2 });
    expect(pool.acquire()).toBe(true);
    expect(pool.acquire()).toBe(true);
    expect(pool.acquire()).toBe(false); // exhausted
    const metrics = pool.getMetrics();
    expect(metrics.activeConnections).toBe(2);
    expect(metrics.waitingRequests).toBe(1);
  });

  it('should release and re-acquire after pool was full', () => {
    const pm = getConnectionPoolManager();
    const pool = pm.getOrCreate('mongodb', 't2', { maxConnections: 1 });
    expect(pool.acquire()).toBe(true);
    expect(pool.acquire()).toBe(false);
    pool.release();
    expect(pool.acquire()).toBe(true); // slot freed
  });

  it('should remove a pool', () => {
    const pm = getConnectionPoolManager();
    pm.getOrCreate('dynamodb', 't1');
    expect(pm.getAllMetrics().length).toBe(1);
    const removed = pm.removePool('dynamodb', 't1');
    expect(removed).toBe(true);
    expect(pm.getAllMetrics().length).toBe(0);
  });

  it('should isolate pools — one tenant exhaustion does not affect another', () => {
    const pm = getConnectionPoolManager();
    const pool1 = pm.getOrCreate('mongodb', 'tenant-A', { maxConnections: 1 });
    const pool2 = pm.getOrCreate('mongodb', 'tenant-B', { maxConnections: 3 });
    pool1.acquire();
    expect(pool1.acquire()).toBe(false); // tenant A exhausted
    expect(pool2.acquire()).toBe(true);  // tenant B still fine
  });

  it('should update pool config dynamically', () => {
    const pm = getConnectionPoolManager();
    const pool = pm.getOrCreate('mongodb', 't1', { maxConnections: 1 });
    pool.acquire();
    expect(pool.acquire()).toBe(false);
    pool.updateConfig({ maxConnections: 5 });
    expect(pool.acquire()).toBe(true); // now has room
  });

  it('should track saturation percentage', () => {
    const pm = getConnectionPoolManager();
    const pool = pm.getOrCreate('mongodb', 't1', { maxConnections: 4 });
    pool.acquire();
    pool.acquire();
    const metrics = pool.getMetrics();
    expect(metrics.saturationPct).toBe(50); // 2/4
  });
});
