/**
 * FDB-ABS-002 — Routing Policy Engine
 *
 * Resolves which provider to target for a given (tenant, project, domain) tuple.
 * Produces observable RoutingDecision records with reasons.
 */

import { v4 as uuid } from 'uuid';
import {
  ProviderId,
  EntityDomain,
  ConsistencyMode,
  RoutingDecision,
  DatastoreProfile,
  ProfileStatus,
  ResidencyPolicy,
} from '../types';
import { ResidencyViolationError } from '../errors';

/* ─── Policy Rule ─── */

export interface RoutingRule {
  tenantId?: string;          // '*' or specific
  projectId?: string;
  domain?: EntityDomain;
  provider: ProviderId;
  consistency: ConsistencyMode;
  priority: number;           // lower = higher priority
}

/* ─── Engine ─── */

export class RoutingPolicyEngine {
  private rules: RoutingRule[] = [];
  private profiles = new Map<string, DatastoreProfile>();
  private residencyPolicies = new Map<string, ResidencyPolicy>();
  private decisionLog: RoutingDecision[] = [];

  /* ── rule CRUD ── */

  addRule(rule: RoutingRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  removeRulesByTenant(tenantId: string): void {
    this.rules = this.rules.filter((r) => r.tenantId !== tenantId);
  }

  /* ── profiles ── */

  setProfile(profile: DatastoreProfile): void {
    this.profiles.set(profileKey(profile.tenantId, profile.projectId), profile);
  }

  getProfile(tenantId: string, projectId?: string): DatastoreProfile | undefined {
    return (
      this.profiles.get(profileKey(tenantId, projectId)) ??
      this.profiles.get(profileKey(tenantId))
    );
  }

  /* ── residency ── */

  setResidencyPolicy(policy: ResidencyPolicy): void {
    this.residencyPolicies.set(policy.tenantId, policy);
  }

  getResidencyPolicy(tenantId: string): ResidencyPolicy | undefined {
    return this.residencyPolicies.get(tenantId);
  }

  /* ── resolve ── */

  resolve(
    tenantId: string,
    domain: EntityDomain,
    projectId?: string,
    correlationId?: string,
  ): RoutingDecision {
    const cid = correlationId ?? uuid();

    // 1. Check active profile for tenant (project-level first)
    const profile = this.getProfile(tenantId, projectId);
    if (profile && profile.status === 'active' as ProfileStatus) {
      // enforce residency
      this.enforceResidency(tenantId, profile);
      const decision = this.buildDecision(
        profile.provider,
        tenantId,
        domain,
        'strong',
        `Active profile ${profile.id} for tenant`,
        cid,
        projectId,
      );
      this.decisionLog.push(decision);
      return decision;
    }

    // 2. Match explicit rules (most specific first by priority)
    for (const rule of this.rules) {
      if (this.ruleMatches(rule, tenantId, domain, projectId)) {
        const decision = this.buildDecision(
          rule.provider,
          tenantId,
          domain,
          rule.consistency,
          `Matched rule priority=${rule.priority}`,
          cid,
          projectId,
        );
        this.decisionLog.push(decision);
        return decision;
      }
    }

    // 3. Default fallback: internal mongodb
    const decision = this.buildDecision(
      'mongodb',
      tenantId,
      domain,
      'strong',
      'Default fallback to internal MongoDB',
      cid,
      projectId,
    );
    this.decisionLog.push(decision);
    return decision;
  }

  /* ── observability ── */

  getRecentDecisions(limit = 100): RoutingDecision[] {
    return this.decisionLog.slice(-limit);
  }

  getDecisionsByTenant(tenantId: string, limit = 50): RoutingDecision[] {
    return this.decisionLog.filter((d) => d.tenantId === tenantId).slice(-limit);
  }

  /* ── internals ── */

  private enforceResidency(tenantId: string, profile: DatastoreProfile): void {
    const policy = this.residencyPolicies.get(tenantId);
    if (!policy) return;

    if (
      policy.allowedProviders.length > 0 &&
      !policy.allowedProviders.includes(profile.provider)
    ) {
      throw new ResidencyViolationError(tenantId, profile.region);
    }
    if (
      policy.allowedRegions.length > 0 &&
      !policy.allowedRegions.includes(profile.region)
    ) {
      throw new ResidencyViolationError(tenantId, profile.region);
    }
  }

  private ruleMatches(
    rule: RoutingRule,
    tenantId: string,
    domain: EntityDomain,
    projectId?: string,
  ): boolean {
    if (rule.tenantId && rule.tenantId !== '*' && rule.tenantId !== tenantId) return false;
    if (rule.projectId && rule.projectId !== projectId) return false;
    if (rule.domain && rule.domain !== domain) return false;
    return true;
  }

  private buildDecision(
    provider: ProviderId,
    tenantId: string,
    domain: EntityDomain,
    consistency: ConsistencyMode,
    reason: string,
    correlationId: string,
    projectId?: string,
  ): RoutingDecision {
    return {
      targetProvider: provider,
      tenantId,
      projectId,
      entityDomain: domain,
      consistencyMode: consistency,
      reason,
      decidedAt: new Date().toISOString(),
      correlationId,
    };
  }
}

/* ─── Singleton ─── */

let _engine: RoutingPolicyEngine | undefined;

export function getRoutingEngine(): RoutingPolicyEngine {
  if (!_engine) _engine = new RoutingPolicyEngine();
  return _engine;
}

export function resetRoutingEngineForTest(): void {
  _engine = undefined;
}

/* ─── Helpers ─── */

function profileKey(tenantId: string, projectId?: string): string {
  return projectId ? `${tenantId}::${projectId}` : tenantId;
}
