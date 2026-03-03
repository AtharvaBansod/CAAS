/**
 * FDB-DRV-004 — Cost & Throughput Guard Profiles
 *
 * Provider-level default guard profiles that limit maximum RPS, connection
 * count, storage capacity and cost thresholds.  Adaptive throttling hooks
 * let the pool manager enforce these in real time.  Cost-observability labels
 * are attached to every pool metric for downstream billing / monitoring.
 */

import { ProviderId } from '../types';

/* ─── Types ─── */

export interface GuardProfile {
  /** Provider this profile applies to */
  provider: ProviderId;
  /** Human-readable label */
  label: string;
  /** Max sustained requests-per-second per tenant */
  maxRps: number;
  /** Max concurrent connections across all tenants */
  maxConnections: number;
  /** Max storage in bytes (-1 = unlimited) */
  maxStorageBytes: number;
  /** Monthly cost budget (USD) — used for alerting only */
  costBudgetUsd: number;
  /** When utilisation exceeds this % of maxRps, start adaptive throttling */
  adaptiveThrottleThresholdPct: number;
  /** When cost exceeds this % of budget, emit warning */
  costWarningThresholdPct: number;
  /** Optional throughput burst allowance (multiplier of maxRps for 10 s windows) */
  burstMultiplier: number;
}

export interface CostLabel {
  provider: ProviderId;
  tenantId: string;
  profileId: string;
  region: string;
  domain: string;
}

export interface CostObservation {
  label: CostLabel;
  timestamp: Date;
  readOps: number;
  writeOps: number;
  storageBytes: number;
  estimatedCostUsd: number;
}

/* ─── Default Guard Profiles ─── */

export const DEFAULT_GUARD_PROFILES: Record<ProviderId, GuardProfile> = {
  mongodb: {
    provider: 'mongodb',
    label: 'MongoDB Default Guard',
    maxRps: 5000,
    maxConnections: 200,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    costBudgetUsd: 500,
    adaptiveThrottleThresholdPct: 80,
    costWarningThresholdPct: 75,
    burstMultiplier: 1.5,
  },
  dynamodb: {
    provider: 'dynamodb',
    label: 'DynamoDB Default Guard',
    maxRps: 3000,
    maxConnections: 100,
    maxStorageBytes: -1, // virtually unlimited
    costBudgetUsd: 800,
    adaptiveThrottleThresholdPct: 70,
    costWarningThresholdPct: 60,
    burstMultiplier: 2.0,
  },
  firestore: {
    provider: 'firestore',
    label: 'Firestore Default Guard',
    maxRps: 2000,
    maxConnections: 80,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    costBudgetUsd: 400,
    adaptiveThrottleThresholdPct: 75,
    costWarningThresholdPct: 70,
    burstMultiplier: 1.3,
  },
  cosmosdb: {
    provider: 'cosmosdb',
    label: 'Cosmos DB Default Guard',
    maxRps: 4000,
    maxConnections: 150,
    maxStorageBytes: 25 * 1024 * 1024 * 1024, // 25 GB
    costBudgetUsd: 600,
    adaptiveThrottleThresholdPct: 70,
    costWarningThresholdPct: 65,
    burstMultiplier: 1.8,
  },
};

/* ─── Guard Profile Manager ─── */

export class GuardProfileManager {
  private profiles: Map<string, GuardProfile> = new Map();
  private observations: CostObservation[] = [];
  private tenantOverrides: Map<string, Partial<GuardProfile>> = new Map(); // key: tenantId:provider

  constructor() {
    // Seed defaults
    for (const p of Object.values(DEFAULT_GUARD_PROFILES)) {
      this.profiles.set(p.provider, { ...p });
    }
  }

  /* ─── Profile CRUD ─── */

  getProfile(provider: ProviderId): GuardProfile {
    const p = this.profiles.get(provider);
    if (!p) throw new Error(`No guard profile for provider ${provider}`);
    return { ...p };
  }

  getEffectiveProfile(provider: ProviderId, tenantId: string): GuardProfile {
    const base = this.getProfile(provider);
    const override = this.tenantOverrides.get(`${tenantId}:${provider}`);
    if (!override) return base;
    return { ...base, ...override, provider: base.provider };
  }

  updateProfile(provider: ProviderId, patch: Partial<Omit<GuardProfile, 'provider'>>): GuardProfile {
    const existing = this.getProfile(provider);
    const updated = { ...existing, ...patch, provider: existing.provider };
    this.profiles.set(provider, updated);
    return { ...updated };
  }

  setTenantOverride(tenantId: string, provider: ProviderId, override: Partial<Omit<GuardProfile, 'provider'>>): void {
    this.tenantOverrides.set(`${tenantId}:${provider}`, override);
  }

  removeTenantOverride(tenantId: string, provider: ProviderId): void {
    this.tenantOverrides.delete(`${tenantId}:${provider}`);
  }

  /* ─── Adaptive Throttling ─── */

  /**
   * Evaluates whether a request should be throttled based on current RPS and guard profile.
   */
  shouldThrottle(provider: ProviderId, tenantId: string, currentRps: number): { throttle: boolean; reason?: string } {
    const profile = this.getEffectiveProfile(provider, tenantId);
    const threshold = profile.maxRps * (profile.adaptiveThrottleThresholdPct / 100);

    // Burst window: allow up to burstMultiplier * maxRps for short bursts
    const burstLimit = profile.maxRps * profile.burstMultiplier;

    if (currentRps >= burstLimit) {
      return { throttle: true, reason: `burst_limit_exceeded: ${currentRps} >= ${burstLimit}` };
    }
    if (currentRps >= profile.maxRps) {
      return { throttle: true, reason: `max_rps_exceeded: ${currentRps} >= ${profile.maxRps}` };
    }
    if (currentRps >= threshold) {
      // Adaptive — probabilistic throttle:
      // as currentRps approaches maxRps the rejection probability increases linearly
      const overThreshold = currentRps - threshold;
      const range = profile.maxRps - threshold;
      const probability = range > 0 ? overThreshold / range : 1;
      const reject = Math.random() < probability;
      if (reject) {
        return { throttle: true, reason: `adaptive_throttle: probability ${(probability * 100).toFixed(1)}%` };
      }
    }
    return { throttle: false };
  }

  /* ─── Cost Observability ─── */

  recordObservation(obs: CostObservation): void {
    this.observations.push(obs);
  }

  getCostSummary(provider: ProviderId, tenantId: string): { totalCostUsd: number; readOps: number; writeOps: number; overBudget: boolean; warningLevel: boolean } {
    const profile = this.getEffectiveProfile(provider, tenantId);
    const relevant = this.observations.filter((o) => o.label.provider === provider && o.label.tenantId === tenantId);
    const totalCostUsd = relevant.reduce((s, o) => s + o.estimatedCostUsd, 0);
    const readOps = relevant.reduce((s, o) => s + o.readOps, 0);
    const writeOps = relevant.reduce((s, o) => s + o.writeOps, 0);
    const warningLevel = totalCostUsd >= profile.costBudgetUsd * (profile.costWarningThresholdPct / 100);
    const overBudget = totalCostUsd >= profile.costBudgetUsd;
    return { totalCostUsd, readOps, writeOps, overBudget, warningLevel };
  }

  getRecentObservations(limit = 100): CostObservation[] {
    return this.observations.slice(-limit);
  }

  /* ─── Reset for testing ─── */

  reset(): void {
    this.profiles.clear();
    this.observations = [];
    this.tenantOverrides.clear();
    for (const p of Object.values(DEFAULT_GUARD_PROFILES)) {
      this.profiles.set(p.provider, { ...p });
    }
  }
}

/* ─── Singleton ─── */

let _instance: GuardProfileManager | null = null;

export function getGuardProfileManager(): GuardProfileManager {
  if (!_instance) _instance = new GuardProfileManager();
  return _instance;
}

export function resetGuardProfileManagerForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
