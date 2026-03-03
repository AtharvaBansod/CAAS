/**
 * Tests for FDB-DRV-004: Cost & Throughput Guard Profiles
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getGuardProfileManager,
  resetGuardProfileManagerForTest,
  DEFAULT_GUARD_PROFILES,
} from '../src/guard-profiles';
import type { CostObservation } from '../src/guard-profiles';

describe('Guard Profile Manager', () => {
  beforeEach(() => {
    resetGuardProfileManagerForTest();
  });

  it('should return default profiles for all providers', () => {
    const mgr = getGuardProfileManager();
    for (const provider of ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const) {
      const profile = mgr.getProfile(provider);
      expect(profile.provider).toBe(provider);
      expect(profile.maxRps).toBeGreaterThan(0);
      expect(profile.maxConnections).toBeGreaterThan(0);
    }
  });

  it('should update a profile', () => {
    const mgr = getGuardProfileManager();
    const updated = mgr.updateProfile('mongodb', { maxRps: 10_000 });
    expect(updated.maxRps).toBe(10_000);
    expect(updated.provider).toBe('mongodb');

    const fetched = mgr.getProfile('mongodb');
    expect(fetched.maxRps).toBe(10_000);
  });

  it('should handle tenant overrides for effective profile', () => {
    const mgr = getGuardProfileManager();
    mgr.setTenantOverride('t1', 'mongodb', { maxRps: 200 });
    const effective = mgr.getEffectiveProfile('mongodb', 't1');
    expect(effective.maxRps).toBe(200);
    expect(effective.provider).toBe('mongodb');

    // Without override falls back to base
    const base = mgr.getEffectiveProfile('mongodb', 'other-tenant');
    expect(base.maxRps).toBe(DEFAULT_GUARD_PROFILES['mongodb'].maxRps);
  });

  it('should remove tenant override', () => {
    const mgr = getGuardProfileManager();
    mgr.setTenantOverride('t1', 'dynamodb', { maxRps: 100 });
    mgr.removeTenantOverride('t1', 'dynamodb');
    const effective = mgr.getEffectiveProfile('dynamodb', 't1');
    expect(effective.maxRps).toBe(DEFAULT_GUARD_PROFILES['dynamodb'].maxRps);
  });

  it('should not throttle under threshold', () => {
    const mgr = getGuardProfileManager();
    const result = mgr.shouldThrottle('mongodb', 't1', 100);
    expect(result.throttle).toBe(false);
  });

  it('should throttle when maxRps exceeded', () => {
    const mgr = getGuardProfileManager();
    const result = mgr.shouldThrottle('mongodb', 't1', 99_999);
    expect(result.throttle).toBe(true);
    expect(result.reason).toBeDefined();
  });

  it('should record cost observations and compute summary', () => {
    const mgr = getGuardProfileManager();
    const obs: CostObservation = {
      label: { provider: 'mongodb', tenantId: 't1', profileId: 'p1', region: 'us-east', domain: 'users' },
      timestamp: new Date(),
      readOps: 100,
      writeOps: 50,
      storageBytes: 1024,
      estimatedCostUsd: 10.5,
    };
    mgr.recordObservation(obs);
    const summary = mgr.getCostSummary('mongodb', 't1');
    expect(summary.totalCostUsd).toBe(10.5);
    expect(summary.readOps).toBe(100);
    expect(summary.writeOps).toBe(50);
    expect(summary.overBudget).toBe(false);
  });

  it('should flag over-budget when cost exceeds budget', () => {
    const mgr = getGuardProfileManager();
    // MongoDB budget is 500 USD
    for (let i = 0; i < 100; i++) {
      mgr.recordObservation({
        label: { provider: 'mongodb', tenantId: 't1', profileId: 'p1', region: 'us-east', domain: 'users' },
        timestamp: new Date(),
        readOps: 10,
        writeOps: 5,
        storageBytes: 100,
        estimatedCostUsd: 10,
      });
    }
    const summary = mgr.getCostSummary('mongodb', 't1');
    expect(summary.totalCostUsd).toBe(1000);
    expect(summary.overBudget).toBe(true);
    expect(summary.warningLevel).toBe(true);
  });

  it('should return recent observations', () => {
    const mgr = getGuardProfileManager();
    mgr.recordObservation({
      label: { provider: 'dynamodb', tenantId: 't1', profileId: 'p1', region: 'eu-west', domain: 'messages' },
      timestamp: new Date(),
      readOps: 50,
      writeOps: 25,
      storageBytes: 512,
      estimatedCostUsd: 5,
    });
    const recent = mgr.getRecentObservations(10);
    expect(recent.length).toBe(1);
  });
});
