/**
 * FDB-OPS-004 — Residency & Legal Hold Service
 *
 * Residency policy enforcement, tenant consent workflow,
 * legal hold management, and compliance evidence generation.
 */

import { v4 as uuid } from 'uuid';
import { ProviderId } from '../types';

/* ─── Types ─── */

export type ConsentStatus = 'pending' | 'granted' | 'revoked';
export type LegalHoldStatus = 'active' | 'released';

export interface ResidencyPolicy {
  id: string;
  tenantId: string;
  allowedRegions: string[];
  allowedProviders: ProviderId[];
  blockCrossRegionReplication: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConsent {
  id: string;
  tenantId: string;
  consentType: string; // e.g. 'data_processing', 'cross_border_transfer'
  status: ConsentStatus;
  grantedBy?: string;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  details: Record<string, unknown>;
}

export interface LegalHold {
  id: string;
  tenantId: string;
  holdName: string;
  reason: string;
  domains: string[]; // entity domains covered
  issuedBy: string;
  issuedAt: Date;
  releasedAt?: Date;
  status: LegalHoldStatus;
}

export interface ComplianceEvidence {
  id: string;
  tenantId: string;
  evidenceType: string;
  generatedAt: Date;
  content: Record<string, unknown>;
}

export interface ResidencyAuditEvent {
  id: string;
  tenantId: string;
  action: string;
  timestamp: Date;
  actor: string;
  details: Record<string, unknown>;
}

/* ─── Residency Service ─── */

export class ResidencyService {
  private policies: Map<string, ResidencyPolicy> = new Map(); // key: tenantId
  private consents: Map<string, TenantConsent> = new Map();
  private legalHolds: Map<string, LegalHold> = new Map();
  private evidence: ComplianceEvidence[] = [];
  private auditLog: ResidencyAuditEvent[] = [];

  /* ─── Residency Policies ─── */

  setPolicy(
    tenantId: string,
    allowedRegions: string[],
    allowedProviders: ProviderId[],
    blockCrossRegion = true,
  ): ResidencyPolicy {
    const existing = this.policies.get(tenantId);
    const policy: ResidencyPolicy = {
      id: existing?.id ?? uuid(),
      tenantId,
      allowedRegions,
      allowedProviders,
      blockCrossRegionReplication: blockCrossRegion,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.policies.set(tenantId, policy);
    this.addAudit(tenantId, 'residency_policy_set', 'system', { allowedRegions, allowedProviders, blockCrossRegion });
    return { ...policy };
  }

  getPolicy(tenantId: string): ResidencyPolicy | null {
    const p = this.policies.get(tenantId);
    return p ? { ...p } : null;
  }

  enforceResidency(tenantId: string, provider: ProviderId, region: string): { allowed: boolean; reason?: string } {
    const policy = this.policies.get(tenantId);
    if (!policy) return { allowed: true }; // no policy = no restriction

    if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(provider)) {
      this.addAudit(tenantId, 'residency_violation_provider', 'system', { provider, allowed: policy.allowedProviders });
      return { allowed: false, reason: `provider ${provider} not in allowed providers` };
    }

    if (policy.allowedRegions.length > 0 && !policy.allowedRegions.includes(region)) {
      this.addAudit(tenantId, 'residency_violation_region', 'system', { region, allowed: policy.allowedRegions });
      return { allowed: false, reason: `region ${region} not in allowed regions` };
    }

    return { allowed: true };
  }

  /* ─── Consent Workflow ─── */

  requestConsent(tenantId: string, consentType: string, details: Record<string, unknown> = {}): TenantConsent {
    const consent: TenantConsent = {
      id: uuid(),
      tenantId,
      consentType,
      status: 'pending',
      details,
    };
    this.consents.set(consent.id, consent);
    this.addAudit(tenantId, 'consent_requested', 'system', { consentType });
    return { ...consent };
  }

  grantConsent(consentId: string, grantedBy: string, expiresAt?: Date): TenantConsent {
    const consent = this.requireConsent(consentId);
    if (consent.status !== 'pending') {
      throw new Error(`consent ${consentId} is in status ${consent.status}, cannot grant`);
    }
    consent.status = 'granted';
    consent.grantedBy = grantedBy;
    consent.grantedAt = new Date();
    consent.expiresAt = expiresAt;
    this.addAudit(consent.tenantId, 'consent_granted', grantedBy, { consentType: consent.consentType });
    return { ...consent };
  }

  revokeConsent(consentId: string, actor: string): TenantConsent {
    const consent = this.requireConsent(consentId);
    consent.status = 'revoked';
    consent.revokedAt = new Date();
    this.addAudit(consent.tenantId, 'consent_revoked', actor, { consentType: consent.consentType });
    return { ...consent };
  }

  getConsentsByTenant(tenantId: string): TenantConsent[] {
    return [...this.consents.values()].filter((c) => c.tenantId === tenantId).map((c) => ({ ...c }));
  }

  hasActiveConsent(tenantId: string, consentType: string): boolean {
    for (const c of this.consents.values()) {
      if (c.tenantId === tenantId && c.consentType === consentType && c.status === 'granted') {
        if (c.expiresAt && c.expiresAt < new Date()) continue; // expired
        return true;
      }
    }
    return false;
  }

  /* ─── Legal Hold ─── */

  createLegalHold(tenantId: string, holdName: string, reason: string, domains: string[], issuedBy: string): LegalHold {
    // Check for duplicate active hold
    for (const h of this.legalHolds.values()) {
      if (h.tenantId === tenantId && h.holdName === holdName && h.status === 'active') {
        throw new Error(`active legal hold "${holdName}" already exists for tenant ${tenantId}`);
      }
    }

    const hold: LegalHold = {
      id: uuid(),
      tenantId,
      holdName,
      reason,
      domains,
      issuedBy,
      issuedAt: new Date(),
      status: 'active',
    };
    this.legalHolds.set(hold.id, hold);
    this.addAudit(tenantId, 'legal_hold_created', issuedBy, { holdName, reason, domains });
    return { ...hold };
  }

  releaseLegalHold(holdId: string, actor: string): LegalHold {
    const hold = this.requireLegalHold(holdId);
    if (hold.status !== 'active') {
      throw new Error(`legal hold ${holdId} is already ${hold.status}`);
    }
    hold.status = 'released';
    hold.releasedAt = new Date();
    this.addAudit(hold.tenantId, 'legal_hold_released', actor, { holdName: hold.holdName });
    return { ...hold };
  }

  getActiveLegalHolds(tenantId: string): LegalHold[] {
    return [...this.legalHolds.values()].filter((h) => h.tenantId === tenantId && h.status === 'active').map((h) => ({ ...h }));
  }

  isUnderLegalHold(tenantId: string, domain?: string): boolean {
    for (const h of this.legalHolds.values()) {
      if (h.tenantId === tenantId && h.status === 'active') {
        if (!domain || h.domains.includes(domain) || h.domains.includes('*')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if a destructive operation (delete / hard-delete) is blocked by a legal hold.
   */
  blockDestructiveOp(tenantId: string, domain: string): { blocked: boolean; holdName?: string } {
    for (const h of this.legalHolds.values()) {
      if (h.tenantId === tenantId && h.status === 'active') {
        if (h.domains.includes(domain) || h.domains.includes('*')) {
          return { blocked: true, holdName: h.holdName };
        }
      }
    }
    return { blocked: false };
  }

  /* ─── Compliance Evidence ─── */

  generateEvidence(tenantId: string, evidenceType: string): ComplianceEvidence {
    const policy = this.getPolicy(tenantId);
    const consents = this.getConsentsByTenant(tenantId);
    const holds = this.getActiveLegalHolds(tenantId);
    const events = this.getAuditEvents(tenantId);

    const ev: ComplianceEvidence = {
      id: uuid(),
      tenantId,
      evidenceType,
      generatedAt: new Date(),
      content: {
        residencyPolicy: policy,
        activeConsents: consents.filter((c) => c.status === 'granted'),
        activeLegalHolds: holds,
        recentAuditEvents: events.slice(-50),
      },
    };
    this.evidence.push(ev);
    this.addAudit(tenantId, 'compliance_evidence_generated', 'system', { evidenceType, evidenceId: ev.id });
    return ev;
  }

  getEvidenceByTenant(tenantId: string): ComplianceEvidence[] {
    return this.evidence.filter((e) => e.tenantId === tenantId);
  }

  /* ─── Audit ─── */

  getAuditEvents(tenantId: string, limit = 200): ResidencyAuditEvent[] {
    return this.auditLog.filter((e) => e.tenantId === tenantId).slice(-limit);
  }

  private addAudit(tenantId: string, action: string, actor: string, details: Record<string, unknown>): void {
    this.auditLog.push({ id: uuid(), tenantId, action, timestamp: new Date(), actor, details });
  }

  /* ─── Helpers ─── */

  private requireConsent(id: string): TenantConsent {
    const c = this.consents.get(id);
    if (!c) throw new Error(`consent ${id} not found`);
    return c;
  }

  private requireLegalHold(id: string): LegalHold {
    const h = this.legalHolds.get(id);
    if (!h) throw new Error(`legal hold ${id} not found`);
    return h;
  }

  /* ─── Reset ─── */

  reset(): void {
    this.policies.clear();
    this.consents.clear();
    this.legalHolds.clear();
    this.evidence = [];
    this.auditLog = [];
  }
}

/* ─── Singleton ─── */

let _instance: ResidencyService | null = null;

export function getResidencyService(): ResidencyService {
  if (!_instance) _instance = new ResidencyService();
  return _instance;
}

export function resetResidencyServiceForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
