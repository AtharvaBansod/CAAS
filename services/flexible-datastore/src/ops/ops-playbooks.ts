/**
 * FDB-OPS-003 — Ops Playbooks & Cost Governance
 *
 * Structured runbooks for provider outage, throttling, credential expiry.
 * Cost telemetry model with aggregation and alerting hooks.
 */

import { v4 as uuid } from 'uuid';
import { ProviderId } from '../types';

/* ─── Types ─── */

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'mitigating' | 'resolved';
export type PlaybookCategory = 'provider_outage' | 'throttle_spike' | 'credential_expiry' | 'storage_limit' | 'cost_overrun' | 'replication_lag';

export interface Playbook {
  id: string;
  category: PlaybookCategory;
  title: string;
  description: string;
  steps: PlaybookStep[];
  autoActions: AutoAction[];
}

export interface PlaybookStep {
  order: number;
  description: string;
  command?: string;
  expectedOutcome: string;
}

export interface AutoAction {
  trigger: string;
  action: string;
  params: Record<string, unknown>;
}

export interface Incident {
  id: string;
  playbookId: string;
  category: PlaybookCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  provider?: ProviderId;
  tenantId?: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  timeline: IncidentTimelineEntry[];
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

export interface CostTelemetryRecord {
  id: string;
  provider: ProviderId;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  readOps: number;
  writeOps: number;
  storageBytes: number;
  networkEgressBytes: number;
  estimatedCostUsd: number;
}

export interface CostAlert {
  id: string;
  tenantId: string;
  provider: ProviderId;
  thresholdPct: number;
  currentCostUsd: number;
  budgetUsd: number;
  triggeredAt: Date;
  acknowledged: boolean;
}

/* ─── Built-in Playbooks ─── */

export const BUILT_IN_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-provider-outage',
    category: 'provider_outage',
    title: 'Provider Outage Response',
    description: 'Steps to handle a complete provider outage with fallback activation.',
    steps: [
      { order: 1, description: 'Verify outage via provider status page and internal health check', expectedOutcome: 'Confirmed outage with timestamp' },
      { order: 2, description: 'Check circuit breaker state for affected provider', command: 'GET /api/health/providers/:provider', expectedOutcome: 'Circuit breaker in OPEN state' },
      { order: 3, description: 'Verify fallback provider is healthy', expectedOutcome: 'Fallback provider responding normally' },
      { order: 4, description: 'Confirm fail_open policy is routing traffic to fallback', expectedOutcome: 'Traffic flowing to fallback provider' },
      { order: 5, description: 'Monitor replay queue depth', command: 'GET /api/fallback/replay-queue', expectedOutcome: 'Queue growing but bounded' },
      { order: 6, description: 'When primary recovers, run integrity check and replay queued writes', expectedOutcome: 'All queued writes replayed successfully' },
    ],
    autoActions: [
      { trigger: 'circuit_breaker_open', action: 'activate_fallback', params: {} },
      { trigger: 'provider_recovered', action: 'replay_queue', params: { batchSize: 100 } },
    ],
  },
  {
    id: 'pb-throttle-spike',
    category: 'throttle_spike',
    title: 'Throttle Spike Response',
    description: 'Handle sustained throttling from provider rate limits.',
    steps: [
      { order: 1, description: 'Identify tenants driving highest RPS', command: 'GET /api/pools/metrics', expectedOutcome: 'Top tenants by RPS identified' },
      { order: 2, description: 'Check guard profile adaptive throttle thresholds', expectedOutcome: 'Current thresholds documented' },
      { order: 3, description: 'Temporarily increase guard profile maxRps if within provider limits', expectedOutcome: 'Throttling reduced' },
      { order: 4, description: 'If persistent, enable tenant-level rate limiting override', expectedOutcome: 'Noisy tenant isolated' },
    ],
    autoActions: [
      { trigger: 'throttle_rate_above_20pct', action: 'increase_pool_size', params: { multiplier: 1.5 } },
    ],
  },
  {
    id: 'pb-credential-expiry',
    category: 'credential_expiry',
    title: 'Credential Expiry Response',
    description: 'Handle expired or soon-to-expire provider credentials.',
    steps: [
      { order: 1, description: 'Identify affected tenants and providers', expectedOutcome: 'List of expiring credentials' },
      { order: 2, description: 'Trigger credential rotation via control plane', command: 'POST /api/control-plane/credentials/:id/rotate', expectedOutcome: 'New credential issued' },
      { order: 3, description: 'Verify connections using new credential', expectedOutcome: 'Health check passes with new credential' },
      { order: 4, description: 'Revoke old credential', expectedOutcome: 'Old credential marked as revoked' },
    ],
    autoActions: [
      { trigger: 'credential_expires_within_24h', action: 'notify_tenant_admin', params: {} },
      { trigger: 'credential_expired', action: 'deactivate_profile', params: {} },
    ],
  },
  {
    id: 'pb-cost-overrun',
    category: 'cost_overrun',
    title: 'Cost Overrun Response',
    description: 'Handle cost budget exceedance for a tenant/provider.',
    steps: [
      { order: 1, description: 'Verify cost data accuracy from telemetry', expectedOutcome: 'Confirmed cost figures' },
      { order: 2, description: 'Identify cost drivers (read/write heavy, storage growth)', expectedOutcome: 'Root cause identified' },
      { order: 3, description: 'Apply guard profile cost cap if available', expectedOutcome: 'Tenant throttled to budget' },
      { order: 4, description: 'Notify tenant admin with cost breakdown', expectedOutcome: 'Tenant informed' },
    ],
    autoActions: [
      { trigger: 'cost_warning_threshold', action: 'send_cost_alert', params: {} },
      { trigger: 'cost_over_budget', action: 'throttle_tenant', params: { targetRpsPct: 50 } },
    ],
  },
];

/* ─── Ops Playbook Manager ─── */

export class OpsPlaybookManager {
  private playbooks: Map<string, Playbook> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private costRecords: CostTelemetryRecord[] = [];
  private costAlerts: CostAlert[] = [];

  constructor() {
    for (const pb of BUILT_IN_PLAYBOOKS) {
      this.playbooks.set(pb.id, { ...pb, steps: [...pb.steps], autoActions: [...pb.autoActions] });
    }
  }

  /* ─── Playbooks ─── */

  getPlaybook(id: string): Playbook | null {
    const pb = this.playbooks.get(id);
    return pb ? { ...pb } : null;
  }

  getPlaybookByCategory(category: PlaybookCategory): Playbook | null {
    for (const pb of this.playbooks.values()) {
      if (pb.category === category) return { ...pb };
    }
    return null;
  }

  listPlaybooks(): Playbook[] {
    return [...this.playbooks.values()];
  }

  addPlaybook(pb: Omit<Playbook, 'id'>): Playbook {
    const full: Playbook = { ...pb, id: `pb-${uuid().slice(0, 8)}` };
    this.playbooks.set(full.id, full);
    return { ...full };
  }

  /* ─── Incidents ─── */

  createIncident(
    category: PlaybookCategory,
    severity: IncidentSeverity,
    title: string,
    description: string,
    opts?: { provider?: ProviderId; tenantId?: string },
  ): Incident {
    const playbook = this.getPlaybookByCategory(category);
    const incident: Incident = {
      id: `inc-${uuid().slice(0, 8)}`,
      playbookId: playbook?.id ?? 'unknown',
      category,
      severity,
      status: 'open',
      provider: opts?.provider,
      tenantId: opts?.tenantId,
      title,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [{ timestamp: new Date(), action: 'incident_created', actor: 'system', details: description }],
    };
    this.incidents.set(incident.id, incident);
    return { ...incident };
  }

  acknowledgeIncident(id: string, actor: string): Incident {
    const inc = this.requireIncident(id);
    inc.status = 'acknowledged';
    inc.updatedAt = new Date();
    inc.timeline.push({ timestamp: new Date(), action: 'acknowledged', actor, details: '' });
    return { ...inc };
  }

  mitigateIncident(id: string, actor: string, details: string): Incident {
    const inc = this.requireIncident(id);
    inc.status = 'mitigating';
    inc.updatedAt = new Date();
    inc.timeline.push({ timestamp: new Date(), action: 'mitigating', actor, details });
    return { ...inc };
  }

  resolveIncident(id: string, actor: string, details: string): Incident {
    const inc = this.requireIncident(id);
    inc.status = 'resolved';
    inc.resolvedAt = new Date();
    inc.updatedAt = new Date();
    inc.timeline.push({ timestamp: new Date(), action: 'resolved', actor, details });
    return { ...inc };
  }

  getIncident(id: string): Incident | null {
    const inc = this.incidents.get(id);
    return inc ? { ...inc } : null;
  }

  listOpenIncidents(): Incident[] {
    return [...this.incidents.values()].filter((i) => i.status !== 'resolved');
  }

  /* ─── Cost Telemetry ─── */

  recordCost(record: Omit<CostTelemetryRecord, 'id'>): CostTelemetryRecord {
    const full: CostTelemetryRecord = { ...record, id: uuid() };
    this.costRecords.push(full);
    return full;
  }

  getCostByTenant(tenantId: string, limit = 100): CostTelemetryRecord[] {
    return this.costRecords.filter((r) => r.tenantId === tenantId).slice(-limit);
  }

  getTotalCost(tenantId: string, provider: ProviderId): number {
    return this.costRecords
      .filter((r) => r.tenantId === tenantId && r.provider === provider)
      .reduce((sum, r) => sum + r.estimatedCostUsd, 0);
  }

  /* ─── Cost Alerting ─── */

  checkCostAlert(tenantId: string, provider: ProviderId, budgetUsd: number, thresholdPct: number): CostAlert | null {
    const total = this.getTotalCost(tenantId, provider);
    if (total >= budgetUsd * (thresholdPct / 100)) {
      const alert: CostAlert = {
        id: uuid(),
        tenantId,
        provider,
        thresholdPct,
        currentCostUsd: total,
        budgetUsd,
        triggeredAt: new Date(),
        acknowledged: false,
      };
      this.costAlerts.push(alert);
      return alert;
    }
    return null;
  }

  getActiveAlerts(): CostAlert[] {
    return this.costAlerts.filter((a) => !a.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.costAlerts.find((a) => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  /* ─── Helpers ─── */

  private requireIncident(id: string): Incident {
    const inc = this.incidents.get(id);
    if (!inc) throw new Error(`incident ${id} not found`);
    return inc;
  }

  reset(): void {
    this.incidents.clear();
    this.costRecords = [];
    this.costAlerts = [];
    this.playbooks.clear();
    for (const pb of BUILT_IN_PLAYBOOKS) {
      this.playbooks.set(pb.id, { ...pb, steps: [...pb.steps], autoActions: [...pb.autoActions] });
    }
  }
}

/* ─── Singleton ─── */

let _instance: OpsPlaybookManager | null = null;

export function getOpsPlaybookManager(): OpsPlaybookManager {
  if (!_instance) _instance = new OpsPlaybookManager();
  return _instance;
}

export function resetOpsPlaybookManagerForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
