/**
 * Tests for FDB-OPS-003: Ops Playbooks & Cost Governance
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getOpsPlaybookManager, resetOpsPlaybookManagerForTest, BUILT_IN_PLAYBOOKS } from '../src/ops';

describe('Ops Playbook Manager', () => {
  beforeEach(() => {
    resetOpsPlaybookManagerForTest();
  });

  it('should load built-in playbooks', () => {
    const om = getOpsPlaybookManager();
    const playbooks = om.listPlaybooks();
    expect(playbooks.length).toBe(BUILT_IN_PLAYBOOKS.length);
  });

  it('should get playbook by id', () => {
    const om = getOpsPlaybookManager();
    const pb = om.getPlaybook('pb-provider-outage');
    expect(pb).not.toBeNull();
    expect(pb!.category).toBe('provider_outage');
    expect(pb!.steps.length).toBeGreaterThan(0);
  });

  it('should get playbook by category', () => {
    const om = getOpsPlaybookManager();
    const pb = om.getPlaybookByCategory('throttle_spike');
    expect(pb).not.toBeNull();
    expect(pb!.id).toBe('pb-throttle-spike');
  });

  it('should add a custom playbook', () => {
    const om = getOpsPlaybookManager();
    const pb = om.addPlaybook({
      category: 'storage_limit',
      title: 'Storage Limit Playbook',
      description: 'Handle storage limits',
      steps: [{ order: 1, description: 'Check usage', expectedOutcome: 'Usage documented' }],
      autoActions: [],
    });
    expect(pb.id).toContain('pb-');
    expect(pb.category).toBe('storage_limit');
    const all = om.listPlaybooks();
    expect(all.length).toBe(BUILT_IN_PLAYBOOKS.length + 1);
  });

  it('should create and manage incident lifecycle', () => {
    const om = getOpsPlaybookManager();
    const inc = om.createIncident('provider_outage', 'high', 'MongoDB Down', 'MongoDB is unreachable', { provider: 'mongodb', tenantId: 't1' });
    expect(inc.id).toContain('inc-');
    expect(inc.status).toBe('open');
    expect(inc.severity).toBe('high');
    expect(inc.provider).toBe('mongodb');

    const acked = om.acknowledgeIncident(inc.id, 'ops-team');
    expect(acked.status).toBe('acknowledged');

    const mit = om.mitigateIncident(inc.id, 'ops-team', 'Switching to fallback');
    expect(mit.status).toBe('mitigating');

    const resolved = om.resolveIncident(inc.id, 'ops-team', 'Provider recovered');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('should list open incidents', () => {
    const om = getOpsPlaybookManager();
    om.createIncident('provider_outage', 'high', 'Issue 1', 'Desc');
    om.createIncident('throttle_spike', 'medium', 'Issue 2', 'Desc');
    const open = om.listOpenIncidents();
    expect(open.length).toBe(2);
  });

  it('should get incident by id', () => {
    const om = getOpsPlaybookManager();
    const inc = om.createIncident('credential_expiry', 'low', 'Cred Expiring', 'Desc');
    const fetched = om.getIncident(inc.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(inc.id);
  });

  it('should record cost telemetry', () => {
    const om = getOpsPlaybookManager();
    const rec = om.recordCost({
      provider: 'mongodb',
      tenantId: 't1',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      readOps: 10_000,
      writeOps: 5_000,
      storageBytes: 1_000_000,
      networkEgressBytes: 500_000,
      estimatedCostUsd: 45.0,
    });
    expect(rec.id).toBeDefined();
    expect(rec.estimatedCostUsd).toBe(45);

    const byTenant = om.getCostByTenant('t1');
    expect(byTenant.length).toBe(1);

    const total = om.getTotalCost('t1', 'mongodb');
    expect(total).toBe(45);
  });

  it('should create cost alert when threshold exceeded', () => {
    const om = getOpsPlaybookManager();
    om.recordCost({
      provider: 'mongodb',
      tenantId: 't1',
      periodStart: new Date(),
      periodEnd: new Date(),
      readOps: 100,
      writeOps: 50,
      storageBytes: 100,
      networkEgressBytes: 50,
      estimatedCostUsd: 400,
    });

    const alert = om.checkCostAlert('t1', 'mongodb', 500, 70);
    expect(alert).not.toBeNull();
    expect(alert!.currentCostUsd).toBe(400);
    expect(alert!.acknowledged).toBe(false);

    // No alert if under threshold
    const noAlert = om.checkCostAlert('t1', 'mongodb', 1000, 50);
    expect(noAlert).toBeNull();
  });

  it('should acknowledge cost alert', () => {
    const om = getOpsPlaybookManager();
    om.recordCost({
      provider: 'dynamodb',
      tenantId: 't2',
      periodStart: new Date(),
      periodEnd: new Date(),
      readOps: 10,
      writeOps: 5,
      storageBytes: 10,
      networkEgressBytes: 5,
      estimatedCostUsd: 600,
    });
    const alert = om.checkCostAlert('t2', 'dynamodb', 500, 50);
    expect(alert).not.toBeNull();
    om.acknowledgeAlert(alert!.id);
    const active = om.getActiveAlerts();
    expect(active.length).toBe(0);
  });
});
