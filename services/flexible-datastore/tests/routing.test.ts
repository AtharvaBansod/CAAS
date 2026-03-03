/**
 * Tests for FDB-ABS-002: Routing Policy Engine
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getRoutingEngine, resetRoutingEngineForTest } from '../src/routing';

describe('Routing Policy Engine', () => {
  beforeEach(() => resetRoutingEngineForTest());

  it('should return mongodb as default when no rules', () => {
    const engine = getRoutingEngine();
    const decision = engine.resolve('t1', 'messages', 'p1');
    expect(decision.targetProvider).toBe('mongodb');
    expect(decision.reason).toContain('Default');
  });

  it('should add and match a rule', () => {
    const engine = getRoutingEngine();
    engine.addRule({
      tenantId: 't1',
      domain: 'messages',
      provider: 'dynamodb',
      consistency: 'eventual',
      priority: 10,
    });
    const decision = engine.resolve('t1', 'messages', 'p1');
    expect(decision.targetProvider).toBe('dynamodb');
    expect(decision.reason).toContain('rule');
  });

  it('should use highest priority rule (lower number)', () => {
    const engine = getRoutingEngine();
    engine.addRule({ tenantId: 't1', domain: 'messages', provider: 'dynamodb', consistency: 'eventual', priority: 20 });
    engine.addRule({ tenantId: 't1', domain: 'messages', provider: 'firestore', consistency: 'strong', priority: 5 });
    const decision = engine.resolve('t1', 'messages', 'p1');
    expect(decision.targetProvider).toBe('firestore');
  });

  it('should respect active profile', () => {
    const engine = getRoutingEngine();
    engine.setProfile({
      id: 'prof-1',
      tenantId: 't1',
      provider: 'cosmosdb',
      region: 'westus2',
      endpoint: 'https://cosmos.example.com',
      authMode: 'connection_string',
      encryptionMode: 'provider_managed',
      allowedDomains: ['messages'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
    });
    const decision = engine.resolve('t1', 'messages');
    expect(decision.targetProvider).toBe('cosmosdb');
  });

  it('should enforce residency policy', () => {
    const engine = getRoutingEngine();
    engine.setResidencyPolicy({ tenantId: 't1', allowedRegions: ['eu-west-1'], allowedProviders: ['mongodb'], legalHoldActive: false });
    engine.setProfile({
      id: 'prof-2',
      tenantId: 't1',
      provider: 'dynamodb',
      region: 'us-east-1',
      endpoint: 'https://ddb.example.com',
      authMode: 'iam_role',
      encryptionMode: 'provider_managed',
      allowedDomains: ['messages'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'test',
    });
    expect(() => engine.resolve('t1', 'messages')).toThrow();
  });

  it('should remove rules by tenant', () => {
    const engine = getRoutingEngine();
    engine.addRule({ tenantId: 't1', domain: 'messages', provider: 'dynamodb', consistency: 'strong', priority: 1 });
    engine.removeRulesByTenant('t1');
    const decision = engine.resolve('t1', 'messages');
    expect(decision.targetProvider).toBe('mongodb');
  });

  it('should track recent decisions', () => {
    const engine = getRoutingEngine();
    engine.resolve('t1', 'messages');
    engine.resolve('t2', 'users');
    expect(engine.getRecentDecisions().length).toBe(2);
  });

  it('should filter decisions by tenant', () => {
    const engine = getRoutingEngine();
    engine.resolve('t1', 'messages');
    engine.resolve('t2', 'users');
    engine.resolve('t1', 'settings');
    expect(engine.getDecisionsByTenant('t1').length).toBe(2);
  });

  it('should wildcard match tenant rules', () => {
    const engine = getRoutingEngine();
    engine.addRule({ tenantId: '*', domain: 'audit', provider: 'cosmosdb', consistency: 'strong', priority: 1 });
    const d1 = engine.resolve('t1', 'audit');
    const d2 = engine.resolve('t2', 'audit');
    expect(d1.targetProvider).toBe('cosmosdb');
    expect(d2.targetProvider).toBe('cosmosdb');
  });
});
