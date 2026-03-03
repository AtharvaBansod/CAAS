/**
 * Tests for FDB-OPS-001: Migration Strategy Service
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getMigrationService, resetMigrationServiceForTest } from '../src/migration';

describe('Migration Service', () => {
  beforeEach(() => {
    resetMigrationServiceForTest();
  });

  it('should create a migration plan', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users', 'messages']);
    expect(plan.id).toBeDefined();
    expect(plan.tenantId).toBe('t1');
    expect(plan.sourceProvider).toBe('mongodb');
    expect(plan.targetProvider).toBe('dynamodb');
    expect(plan.phase).toBe('idle');
    expect(plan.domains).toEqual(['users', 'messages']);
  });

  it('should reject creating plan with same source and target', () => {
    const ms = getMigrationService();
    expect(() => ms.createPlan('t1', 'mongodb', 'mongodb', ['users'])).toThrow('source and target providers must differ');
  });

  it('should reject duplicate active migration for same tenant', () => {
    const ms = getMigrationService();
    ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    expect(() => ms.createPlan('t1', 'firestore', 'cosmosdb', ['messages'])).toThrow('already has an active migration');
  });

  it('should transition through dual_write → shadow_read', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);

    const dw = ms.startDualWrite(plan.id);
    expect(dw.phase).toBe('dual_write');

    const sr = ms.startShadowRead(plan.id);
    expect(sr.phase).toBe('shadow_read');
  });

  it('should reject invalid phase transitions', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    expect(() => ms.startShadowRead(plan.id)).toThrow('cannot transition');
  });

  it('should rollback from dual_write', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    ms.startDualWrite(plan.id);
    const rb = ms.rollback(plan.id, 'test rollback');
    expect(rb.phase).toBe('rollback');
    expect(rb.error).toBe('test rollback');
  });

  it('should reject rollback from idle', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    expect(() => ms.rollback(plan.id, 'nope')).toThrow('cannot rollback from phase idle');
  });

  it('should list plans by tenant', () => {
    const ms = getMigrationService();
    ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    const plans = ms.listPlansByTenant('t1');
    expect(plans.length).toBe(1);
    expect(plans[0].tenantId).toBe('t1');
  });

  it('should get plan by id', () => {
    const ms = getMigrationService();
    const created = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    const fetched = ms.getPlan(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it('should return null for non-existent plan', () => {
    const ms = getMigrationService();
    expect(ms.getPlan('nope')).toBeNull();
  });

  it('should track events', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    ms.startDualWrite(plan.id);
    const events = ms.getEvents(plan.id);
    expect(events.length).toBeGreaterThanOrEqual(2); // plan_created + dual_write_started
    expect(events[0].action).toBe('plan_created');
  });

  it('should update progress and record divergence', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    ms.startDualWrite(plan.id);
    ms.updateProgress(plan.id, { totalDocuments: 100, migratedDocuments: 50 });
    ms.recordDivergence(plan.id, 'users', { docId: 'abc' });

    const updated = ms.getPlan(plan.id);
    expect(updated!.progress.totalDocuments).toBe(100);
    expect(updated!.progress.migratedDocuments).toBe(50);
    expect(updated!.progress.divergenceCount).toBe(1);
  });

  it('should complete full lifecycle: idle → dual_write → shadow_read → cutover → completed', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users'], {
      minShadowReadSeconds: 0, // disable time check for test
      maxDivergenceCount: 0,
      requireChecksumMatch: false, // disable checksum check for test
    });
    expect(plan.phase).toBe('idle');

    const dw = ms.startDualWrite(plan.id);
    expect(dw.phase).toBe('dual_write');

    const sr = ms.startShadowRead(plan.id);
    expect(sr.phase).toBe('shadow_read');

    const co = ms.cutover(plan.id);
    expect(co.phase).toBe('cutover');

    const done = ms.completeMigration(plan.id);
    expect(done.phase).toBe('completed');

    // After completing, should be able to create a new migration for the same tenant
    const plan2 = ms.createPlan('t1', 'mongodb', 'firestore', ['messages']);
    expect(plan2.phase).toBe('idle');
  });

  it('should reject cutover when divergence exceeds threshold', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users'], {
      minShadowReadSeconds: 0,
      maxDivergenceCount: 0,
      requireChecksumMatch: false,
    });
    ms.startDualWrite(plan.id);
    ms.startShadowRead(plan.id);
    ms.recordDivergence(plan.id, 'users', { docId: 'bad-doc' });
    expect(() => ms.cutover(plan.id)).toThrow('divergence count');
  });

  it('should reject complete from non-cutover phase', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    ms.startDualWrite(plan.id);
    expect(() => ms.completeMigration(plan.id)).toThrow('cannot transition');
  });

  it('should rollback from shadow_read', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users']);
    ms.startDualWrite(plan.id);
    ms.startShadowRead(plan.id);
    const rb = ms.rollback(plan.id, 'data issues');
    expect(rb.phase).toBe('rollback');
    expect(rb.error).toBe('data issues');
  });

  it('should rollback from cutover', () => {
    const ms = getMigrationService();
    const plan = ms.createPlan('t1', 'mongodb', 'dynamodb', ['users'], {
      minShadowReadSeconds: 0,
      maxDivergenceCount: 0,
      requireChecksumMatch: false,
    });
    ms.startDualWrite(plan.id);
    ms.startShadowRead(plan.id);
    ms.cutover(plan.id);
    const rb = ms.rollback(plan.id, 'cutover failed');
    expect(rb.phase).toBe('rollback');
  });
});
