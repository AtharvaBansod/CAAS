/**
 * Tests for FDB-OPS-004: Residency & Legal Hold
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getResidencyService, resetResidencyServiceForTest } from '../src/residency';

describe('Residency Service', () => {
  beforeEach(() => {
    resetResidencyServiceForTest();
  });

  /* ─── Residency Policy ─── */

  it('should set and get a residency policy', () => {
    const rs = getResidencyService();
    const policy = rs.setPolicy('t1', ['us-east-1', 'eu-west-1'], ['mongodb', 'dynamodb']);
    expect(policy.tenantId).toBe('t1');
    expect(policy.allowedRegions).toEqual(['us-east-1', 'eu-west-1']);
    expect(policy.allowedProviders).toEqual(['mongodb', 'dynamodb']);
    expect(policy.blockCrossRegionReplication).toBe(true);

    const fetched = rs.getPolicy('t1');
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(policy.id);
  });

  it('should return null for tenant without policy', () => {
    const rs = getResidencyService();
    expect(rs.getPolicy('nope')).toBeNull();
  });

  it('should enforce residency — allowed', () => {
    const rs = getResidencyService();
    rs.setPolicy('t1', ['us-east-1'], ['mongodb']);
    const result = rs.enforceResidency('t1', 'mongodb', 'us-east-1');
    expect(result.allowed).toBe(true);
  });

  it('should enforce residency — denied by region', () => {
    const rs = getResidencyService();
    rs.setPolicy('t1', ['us-east-1'], ['mongodb']);
    const result = rs.enforceResidency('t1', 'mongodb', 'ap-southeast-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in allowed regions');
  });

  it('should enforce residency — denied by provider', () => {
    const rs = getResidencyService();
    rs.setPolicy('t1', ['us-east-1'], ['mongodb']);
    const result = rs.enforceResidency('t1', 'dynamodb', 'us-east-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in allowed providers');
  });

  it('should allow when no policy exists', () => {
    const rs = getResidencyService();
    expect(rs.enforceResidency('t1', 'mongodb', 'anywhere').allowed).toBe(true);
  });

  /* ─── Consent Workflow ─── */

  it('should request, grant, and revoke consent', () => {
    const rs = getResidencyService();
    const consent = rs.requestConsent('t1', 'data_processing');
    expect(consent.status).toBe('pending');
    expect(consent.consentType).toBe('data_processing');

    const granted = rs.grantConsent(consent.id, 'admin@company.com');
    expect(granted.status).toBe('granted');
    expect(granted.grantedBy).toBe('admin@company.com');

    expect(rs.hasActiveConsent('t1', 'data_processing')).toBe(true);

    const revoked = rs.revokeConsent(consent.id, 'admin@company.com');
    expect(revoked.status).toBe('revoked');

    expect(rs.hasActiveConsent('t1', 'data_processing')).toBe(false);
  });

  it('should reject granting non-pending consent', () => {
    const rs = getResidencyService();
    const consent = rs.requestConsent('t1', 'data_processing');
    rs.grantConsent(consent.id, 'admin');
    expect(() => rs.grantConsent(consent.id, 'admin')).toThrow('cannot grant');
  });

  it('should list consents by tenant', () => {
    const rs = getResidencyService();
    rs.requestConsent('t1', 'data_processing');
    rs.requestConsent('t1', 'cross_border_transfer');
    const consents = rs.getConsentsByTenant('t1');
    expect(consents.length).toBe(2);
  });

  /* ─── Legal Hold ─── */

  it('should create and release legal holds', () => {
    const rs = getResidencyService();
    const hold = rs.createLegalHold('t1', 'litigation-hold-1', 'Pending lawsuit', ['messages', 'audit'], 'legal@corp.com');
    expect(hold.status).toBe('active');
    expect(hold.holdName).toBe('litigation-hold-1');
    expect(hold.domains).toContain('messages');

    expect(rs.isUnderLegalHold('t1', 'messages')).toBe(true);
    expect(rs.isUnderLegalHold('t1', 'users')).toBe(false);

    const released = rs.releaseLegalHold(hold.id, 'legal@corp.com');
    expect(released.status).toBe('released');
    expect(rs.isUnderLegalHold('t1', 'messages')).toBe(false);
  });

  it('should reject duplicate active legal hold', () => {
    const rs = getResidencyService();
    rs.createLegalHold('t1', 'hold-1', 'reason', ['*'], 'legal');
    expect(() => rs.createLegalHold('t1', 'hold-1', 'reason', ['*'], 'legal')).toThrow('already exists');
  });

  it('should block destructive ops under legal hold', () => {
    const rs = getResidencyService();
    rs.createLegalHold('t1', 'hold', 'reason', ['messages'], 'legal');
    const block = rs.blockDestructiveOp('t1', 'messages');
    expect(block.blocked).toBe(true);
    expect(block.holdName).toBe('hold');

    const noBlock = rs.blockDestructiveOp('t1', 'users');
    expect(noBlock.blocked).toBe(false);
  });

  it('should get active legal holds', () => {
    const rs = getResidencyService();
    rs.createLegalHold('t1', 'hold-a', 'r1', ['*'], 'legal');
    rs.createLegalHold('t1', 'hold-b', 'r2', ['audit'], 'legal');
    const holds = rs.getActiveLegalHolds('t1');
    expect(holds.length).toBe(2);
  });

  /* ─── Evidence Generation ─── */

  it('should generate compliance evidence', () => {
    const rs = getResidencyService();
    rs.setPolicy('t1', ['us-east-1'], ['mongodb']);
    rs.requestConsent('t1', 'data_processing');
    rs.createLegalHold('t1', 'hold', 'reason', ['*'], 'legal');

    const evidence = rs.generateEvidence('t1', 'full_compliance');
    expect(evidence.tenantId).toBe('t1');
    expect(evidence.evidenceType).toBe('full_compliance');
    expect(evidence.content.residencyPolicy).toBeDefined();
    expect(evidence.content.activeLegalHolds).toBeDefined();
  });

  it('should retrieve evidence by tenant', () => {
    const rs = getResidencyService();
    rs.generateEvidence('t1', 'audit');
    const evidence = rs.getEvidenceByTenant('t1');
    expect(evidence.length).toBe(1);
  });

  /* ─── Audit ─── */

  it('should track audit events', () => {
    const rs = getResidencyService();
    rs.setPolicy('t1', ['us-east-1'], ['mongodb']);
    const events = rs.getAuditEvents('t1');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].action).toBe('residency_policy_set');
  });
});
