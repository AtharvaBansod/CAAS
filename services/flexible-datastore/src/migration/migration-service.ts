/**
 * FDB-OPS-001 — Migration Strategy Service
 *
 * Dual-write / shadow-read migration plan, cutover criteria, rollback hooks,
 * and integrity checksums for live-migrating tenant data between providers.
 */

import { v4 as uuid } from 'uuid';
import { ProviderId, EntityDomain } from '../types';
import { IDatastoreRepository } from '../abstraction';

/* ─── Types ─── */

export type MigrationPhase = 'idle' | 'dual_write' | 'shadow_read' | 'cutover' | 'rollback' | 'completed';

export interface MigrationPlan {
  id: string;
  tenantId: string;
  sourceProvider: ProviderId;
  targetProvider: ProviderId;
  domains: EntityDomain[];
  phase: MigrationPhase;
  createdAt: Date;
  updatedAt: Date;
  cutoverCriteria: CutoverCriteria;
  progress: MigrationProgress;
  checksums: DomainChecksum[];
  error?: string;
}

export interface CutoverCriteria {
  /** Minimum seconds the shadow-read must run without divergence */
  minShadowReadSeconds: number;
  /** Maximum acceptable divergence count before blocking cutover */
  maxDivergenceCount: number;
  /** Must all checksums match? */
  requireChecksumMatch: boolean;
}

export interface MigrationProgress {
  totalDocuments: number;
  migratedDocuments: number;
  divergenceCount: number;
  shadowReadStartedAt?: Date;
  lastChecksumAt?: Date;
}

export interface DomainChecksum {
  domain: EntityDomain;
  sourceChecksum: string;
  targetChecksum: string;
  match: boolean;
  computedAt: Date;
}

export interface MigrationEvent {
  id: string;
  migrationId: string;
  phase: MigrationPhase;
  action: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

/* ─── Default Cutover Criteria ─── */

export const DEFAULT_CUTOVER_CRITERIA: CutoverCriteria = {
  minShadowReadSeconds: 300, // 5 minutes
  maxDivergenceCount: 0,
  requireChecksumMatch: true,
};

/* ─── Migration Service ─── */

export class MigrationService {
  private plans: Map<string, MigrationPlan> = new Map();
  private events: MigrationEvent[] = [];

  /* ─── Plan CRUD ─── */

  createPlan(
    tenantId: string,
    sourceProvider: ProviderId,
    targetProvider: ProviderId,
    domains: EntityDomain[],
    criteria: Partial<CutoverCriteria> = {},
  ): MigrationPlan {
    if (sourceProvider === targetProvider) {
      throw new Error('source and target providers must differ');
    }
    // Only one active plan per tenant
    for (const p of this.plans.values()) {
      if (p.tenantId === tenantId && p.phase !== 'completed' && p.phase !== 'rollback') {
        throw new Error(`tenant ${tenantId} already has an active migration: ${p.id}`);
      }
    }

    const plan: MigrationPlan = {
      id: uuid(),
      tenantId,
      sourceProvider,
      targetProvider,
      domains,
      phase: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
      cutoverCriteria: { ...DEFAULT_CUTOVER_CRITERIA, ...criteria },
      progress: { totalDocuments: 0, migratedDocuments: 0, divergenceCount: 0 },
      checksums: [],
    };
    this.plans.set(plan.id, plan);
    this.addEvent(plan.id, 'idle', 'plan_created', { sourceProvider, targetProvider, domains });
    return { ...plan };
  }

  getPlan(id: string): MigrationPlan | null {
    const p = this.plans.get(id);
    return p ? { ...p } : null;
  }

  listPlansByTenant(tenantId: string): MigrationPlan[] {
    return [...this.plans.values()].filter((p) => p.tenantId === tenantId).map((p) => ({ ...p }));
  }

  /* ─── Phase Transitions ─── */

  startDualWrite(planId: string): MigrationPlan {
    const plan = this.requirePlan(planId);
    this.assertPhase(plan, 'idle', 'dual_write');
    plan.phase = 'dual_write';
    plan.updatedAt = new Date();
    this.addEvent(planId, 'dual_write', 'dual_write_started', {});
    return { ...plan };
  }

  startShadowRead(planId: string): MigrationPlan {
    const plan = this.requirePlan(planId);
    this.assertPhase(plan, 'dual_write', 'shadow_read');
    plan.phase = 'shadow_read';
    plan.progress.shadowReadStartedAt = new Date();
    plan.updatedAt = new Date();
    this.addEvent(planId, 'shadow_read', 'shadow_read_started', {});
    return { ...plan };
  }

  cutover(planId: string): MigrationPlan {
    const plan = this.requirePlan(planId);
    this.assertPhase(plan, 'shadow_read', 'cutover');

    // Validate cutover criteria
    const c = plan.cutoverCriteria;
    if (plan.progress.divergenceCount > c.maxDivergenceCount) {
      throw new Error(`divergence count ${plan.progress.divergenceCount} exceeds max ${c.maxDivergenceCount}`);
    }
    if (plan.progress.shadowReadStartedAt) {
      const elapsed = (Date.now() - plan.progress.shadowReadStartedAt.getTime()) / 1000;
      if (elapsed < c.minShadowReadSeconds) {
        throw new Error(`shadow read has only run ${elapsed.toFixed(0)}s, need ${c.minShadowReadSeconds}s`);
      }
    }
    if (c.requireChecksumMatch) {
      const mismatch = plan.checksums.filter((cs) => !cs.match);
      if (mismatch.length > 0) {
        throw new Error(`checksum mismatch on domains: ${mismatch.map((m) => m.domain).join(', ')}`);
      }
    }

    plan.phase = 'cutover';
    plan.updatedAt = new Date();
    this.addEvent(planId, 'cutover', 'cutover_executed', { divergenceCount: plan.progress.divergenceCount });
    return { ...plan };
  }

  completeMigration(planId: string): MigrationPlan {
    const plan = this.requirePlan(planId);
    this.assertPhase(plan, 'cutover', 'completed');
    plan.phase = 'completed';
    plan.updatedAt = new Date();
    this.addEvent(planId, 'completed', 'migration_completed', {});
    return { ...plan };
  }

  rollback(planId: string, reason: string): MigrationPlan {
    const plan = this.requirePlan(planId);
    if (plan.phase === 'completed' || plan.phase === 'idle') {
      throw new Error(`cannot rollback from phase ${plan.phase}`);
    }
    plan.phase = 'rollback';
    plan.error = reason;
    plan.updatedAt = new Date();
    this.addEvent(planId, 'rollback', 'migration_rolled_back', { reason });
    return { ...plan };
  }

  /* ─── Progress & Checksums ─── */

  updateProgress(planId: string, patch: Partial<MigrationProgress>): void {
    const plan = this.requirePlan(planId);
    Object.assign(plan.progress, patch);
    plan.updatedAt = new Date();
  }

  recordDivergence(planId: string, domain: EntityDomain, details: Record<string, unknown>): void {
    const plan = this.requirePlan(planId);
    plan.progress.divergenceCount++;
    plan.updatedAt = new Date();
    this.addEvent(planId, plan.phase, 'divergence_detected', { domain, ...details });
  }

  async computeChecksum(
    planId: string,
    domain: EntityDomain,
    sourceRepo: IDatastoreRepository,
    targetRepo: IDatastoreRepository,
    tenantId: string,
  ): Promise<DomainChecksum> {
    const plan = this.requirePlan(planId);

    const sourceCount = await sourceRepo.count({}, { tenantId, projectId: '' });
    const targetCount = await targetRepo.count({}, { tenantId, projectId: '' });

    // Simple count-based checksum (extensible to hash-based)
    const srcHash = `count:${sourceCount}`;
    const tgtHash = `count:${targetCount}`;
    const match = srcHash === tgtHash;

    const cs: DomainChecksum = {
      domain,
      sourceChecksum: srcHash,
      targetChecksum: tgtHash,
      match,
      computedAt: new Date(),
    };
    // Replace or append
    const idx = plan.checksums.findIndex((c) => c.domain === domain);
    if (idx >= 0) plan.checksums[idx] = cs;
    else plan.checksums.push(cs);

    plan.progress.lastChecksumAt = new Date();
    plan.updatedAt = new Date();
    this.addEvent(planId, plan.phase, 'checksum_computed', { domain, match, srcHash, tgtHash });
    return cs;
  }

  /* ─── Audit ─── */

  getEvents(migrationId: string): MigrationEvent[] {
    return this.events.filter((e) => e.migrationId === migrationId);
  }

  /* ─── Helpers ─── */

  private requirePlan(id: string): MigrationPlan {
    const p = this.plans.get(id);
    if (!p) throw new Error(`migration plan ${id} not found`);
    return p;
  }

  private assertPhase(plan: MigrationPlan, expected: MigrationPhase, next: MigrationPhase): void {
    if (plan.phase !== expected) {
      throw new Error(`cannot transition to ${next}: plan is in phase ${plan.phase}, expected ${expected}`);
    }
  }

  private addEvent(migrationId: string, phase: MigrationPhase, action: string, details: Record<string, unknown>): void {
    this.events.push({ id: uuid(), migrationId, phase, action, timestamp: new Date(), details });
  }

  /* ─── Reset ─── */

  reset(): void {
    this.plans.clear();
    this.events = [];
  }
}

/* ─── Singleton ─── */

let _instance: MigrationService | null = null;

export function getMigrationService(): MigrationService {
  if (!_instance) _instance = new MigrationService();
  return _instance;
}

export function resetMigrationServiceForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
