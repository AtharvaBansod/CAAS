/**
 * Tests for FDB-ABS-003: Fallback & Circuit Breaker
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getFallbackController, resetFallbackForTest } from '../src/fallback';

describe('Fallback & Circuit Breaker', () => {
  beforeEach(() => resetFallbackForTest());

  it('should start breakers in closed state', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('mongodb');
    expect(breaker.getState()).toBe('closed');
  });

  it('should open breaker after failure threshold', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('dynamodb');
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure();
    }
    expect(breaker.getState()).toBe('open');
  });

  it('should record success and keep breaker closed', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('mongodb');
    breaker.recordSuccess();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });

  it('should provide fallback when circuit is open (fail_open)', () => {
    const fb = getFallbackController();
    fb.addFallbackRule({ domain: 'users', failPolicy: 'fail_open', fallbackProvider: 'mongodb' });
    const breaker = fb.getOrCreateBreaker('dynamodb');
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    const target = fb.resolveFallback('dynamodb', 'users');
    expect(target).toBe('mongodb');
  });

  it('should return same provider when breaker closed', () => {
    const fb = getFallbackController();
    fb.getOrCreateBreaker('mongodb');
    const target = fb.resolveFallback('mongodb', 'users');
    expect(target).toBe('mongodb');
  });

  it('should throw when circuit open and fail_closed', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('firestore');
    for (let i = 0; i < 5; i++) breaker.recordFailure();
    // No fallback rule → fail_closed
    expect(() => fb.resolveFallback('firestore', 'users')).toThrow();
  });

  it('should manage replay queue', () => {
    const fb = getFallbackController();
    fb.enqueueReplay({
      id: 'r1',
      tenantId: 't1',
      domain: 'users',
      operation: 'create',
      payload: { id: 'r1' },
      originalProvider: 'dynamodb',
      failedAt: new Date().toISOString(),
      retryCount: 0,
    });
    expect(fb.replayQueueSize()).toBe(1);
    const drained = fb.dequeueReplay(10);
    expect(drained.length).toBe(1);
    expect(fb.replayQueueSize()).toBe(0);
  });

  it('should update and query health cache', () => {
    const fb = getFallbackController();
    fb.updateHealth({ provider: 'mongodb', status: 'healthy', latencyMs: 5, checkedAt: new Date().toISOString() });
    fb.updateHealth({ provider: 'dynamodb', status: 'unhealthy', latencyMs: 5000, checkedAt: new Date().toISOString() });
    const health = fb.getAllHealth();
    expect(health.length).toBe(2);
    const mongoHealth = fb.getHealth('mongodb');
    expect(mongoHealth?.status).toBe('healthy');
  });

  it('should transition to half_open after reset timeout', () => {
    const fb = getFallbackController();
    // Use very short reset timeout so test doesn't wait
    const breaker = fb.getOrCreateBreaker('cosmosdb', { failureThreshold: 2, resetTimeoutMs: 1, halfOpenMaxAttempts: 1 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    // Wait a tick for 1ms timeout to elapse
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    expect(breaker.getState()).toBe('half_open');
    expect(breaker.allowRequest()).toBe(true);
  });

  it('should recover from half_open to closed after enough successes', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('firestore', { failureThreshold: 2, resetTimeoutMs: 1, halfOpenMaxAttempts: 2 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    // Wait for reset
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    expect(breaker.getState()).toBe('half_open');
    breaker.recordSuccess();
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('closed');
  });

  it('should re-open from half_open on failure', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('dynamodb', { failureThreshold: 2, resetTimeoutMs: 1, halfOpenMaxAttempts: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }
    expect(breaker.getState()).toBe('half_open');
    breaker.recordFailure(); // should go back to open
    expect(breaker.getState()).toBe('open');
  });

  it('should support configurable failure threshold', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('mongodb', { failureThreshold: 3 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('closed'); // only 2, threshold is 3
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open'); // now 3
  });

  it('should reset breaker explicitly', () => {
    const fb = getFallbackController();
    const breaker = fb.getOrCreateBreaker('cosmosdb', { failureThreshold: 2 });
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('open');
    breaker.reset();
    expect(breaker.getState()).toBe('closed');
  });
});
