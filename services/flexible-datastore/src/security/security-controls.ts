/**
 * FDB-OPS-002 — Security & Compliance Controls
 *
 * Encryption-at-rest / in-transit requirements, access control boundaries,
 * comprehensive audit event taxonomy, and field-level encryption markers.
 */

import { v4 as uuid } from 'uuid';
import { ProviderId } from '../types';

/* ─── Types ─── */

export type EncryptionMode = 'none' | 'provider_managed' | 'customer_managed' | 'field_level';

export interface EncryptionPolicy {
  atRest: EncryptionMode;
  inTransit: boolean; // TLS required
  fieldLevelFields: string[]; // fields requiring envelope encryption
}

export interface AccessBoundary {
  tenantId: string;
  provider: ProviderId;
  allowedRegions: string[];
  allowedIpRanges: string[];
  requireMfa: boolean;
  maxSessionDurationMinutes: number;
}

export type SecurityEventType =
  | 'credential_created'
  | 'credential_rotated'
  | 'credential_revoked'
  | 'credential_expired'
  | 'access_granted'
  | 'access_denied'
  | 'encryption_key_rotated'
  | 'policy_changed'
  | 'field_decrypted'
  | 'unauthorized_access_attempt'
  | 'residency_violation'
  | 'compliance_check_passed'
  | 'compliance_check_failed';

export interface SecurityAuditEvent {
  id: string;
  type: SecurityEventType;
  timestamp: Date;
  tenantId: string;
  actor: string;
  provider?: ProviderId;
  resource?: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
}

export interface ComplianceReport {
  tenantId: string;
  generatedAt: Date;
  encryptionCompliant: boolean;
  accessBoundaryCompliant: boolean;
  auditTrailComplete: boolean;
  findings: ComplianceFinding[];
}

export interface ComplianceFinding {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  remediation: string;
}

/* ─── Default Policies ─── */

export const DEFAULT_ENCRYPTION_POLICY: EncryptionPolicy = {
  atRest: 'provider_managed',
  inTransit: true,
  fieldLevelFields: [],
};

/* ─── Security Controls Service ─── */

export class SecurityControlsService {
  private encryptionPolicies: Map<string, EncryptionPolicy> = new Map(); // key: tenantId:provider
  private accessBoundaries: Map<string, AccessBoundary> = new Map(); // key: tenantId:provider
  private auditLog: SecurityAuditEvent[] = [];

  /* ─── Encryption Policy ─── */

  setEncryptionPolicy(tenantId: string, provider: ProviderId, policy: EncryptionPolicy): void {
    const key = `${tenantId}:${provider}`;
    this.encryptionPolicies.set(key, { ...policy });
    this.recordEvent({
      type: 'policy_changed',
      tenantId,
      actor: 'system',
      provider,
      details: { policyType: 'encryption', ...policy },
      severity: 'info',
    });
  }

  getEncryptionPolicy(tenantId: string, provider: ProviderId): EncryptionPolicy {
    const key = `${tenantId}:${provider}`;
    return this.encryptionPolicies.get(key) ?? { ...DEFAULT_ENCRYPTION_POLICY };
  }

  validateEncryption(tenantId: string, provider: ProviderId): { compliant: boolean; issues: string[] } {
    const policy = this.getEncryptionPolicy(tenantId, provider);
    const issues: string[] = [];

    if (policy.atRest === 'none') {
      issues.push('encryption-at-rest is disabled');
    }
    if (!policy.inTransit) {
      issues.push('TLS/in-transit encryption is disabled');
    }

    const compliant = issues.length === 0;
    this.recordEvent({
      type: compliant ? 'compliance_check_passed' : 'compliance_check_failed',
      tenantId,
      actor: 'system',
      provider,
      details: { check: 'encryption', issues },
      severity: compliant ? 'info' : 'warning',
    });
    return { compliant, issues };
  }

  /* ─── Access Boundaries ─── */

  setAccessBoundary(boundary: AccessBoundary): void {
    const key = `${boundary.tenantId}:${boundary.provider}`;
    this.accessBoundaries.set(key, { ...boundary });
    this.recordEvent({
      type: 'policy_changed',
      tenantId: boundary.tenantId,
      actor: 'system',
      provider: boundary.provider,
      details: { policyType: 'access_boundary', ...boundary },
      severity: 'info',
    });
  }

  getAccessBoundary(tenantId: string, provider: ProviderId): AccessBoundary | null {
    return this.accessBoundaries.get(`${tenantId}:${provider}`) ?? null;
  }

  validateAccess(tenantId: string, provider: ProviderId, region: string, ipAddress?: string): { allowed: boolean; reason?: string } {
    const boundary = this.getAccessBoundary(tenantId, provider);
    if (!boundary) {
      return { allowed: true }; // no boundary = no restriction
    }

    if (boundary.allowedRegions.length > 0 && !boundary.allowedRegions.includes(region)) {
      this.recordEvent({
        type: 'access_denied',
        tenantId,
        actor: 'system',
        provider,
        details: { reason: 'region_not_allowed', region, allowedRegions: boundary.allowedRegions },
        severity: 'warning',
      });
      return { allowed: false, reason: `region ${region} not in allowed regions` };
    }

    if (ipAddress && boundary.allowedIpRanges.length > 0) {
      const ipAllowed = boundary.allowedIpRanges.some((range) => ipMatchesCIDR(ipAddress, range));
      if (!ipAllowed) {
        this.recordEvent({
          type: 'access_denied',
          tenantId,
          actor: 'system',
          provider,
          details: { reason: 'ip_not_allowed', ipAddress },
          severity: 'warning',
        });
        return { allowed: false, reason: `IP ${ipAddress} not in allowed ranges` };
      }
    }

    this.recordEvent({
      type: 'access_granted',
      tenantId,
      actor: 'system',
      provider,
      details: { region, ipAddress },
      severity: 'info',
    });
    return { allowed: true };
  }

  /* ─── Compliance Report ─── */

  generateComplianceReport(tenantId: string, provider: ProviderId): ComplianceReport {
    const findings: ComplianceFinding[] = [];

    // Check encryption
    const encResult = this.validateEncryption(tenantId, provider);
    for (const issue of encResult.issues) {
      findings.push({
        category: 'encryption',
        severity: 'critical',
        description: issue,
        remediation: 'Enable encryption-at-rest and in-transit for all datastore connections',
      });
    }

    // Check access boundary
    const boundary = this.getAccessBoundary(tenantId, provider);
    const accessCompliant = boundary !== null;
    if (!accessCompliant) {
      findings.push({
        category: 'access_control',
        severity: 'warning',
        description: 'No access boundary configured',
        remediation: 'Configure allowed regions and IP ranges for tenant datastore access',
      });
    }

    // Audit trail check — ensure events exist
    const tenantEvents = this.getEventsByTenant(tenantId);
    const auditComplete = tenantEvents.length > 0;
    if (!auditComplete) {
      findings.push({
        category: 'audit',
        severity: 'warning',
        description: 'No audit events recorded for tenant',
        remediation: 'Verify audit logging is enabled and events are being captured',
      });
    }

    return {
      tenantId,
      generatedAt: new Date(),
      encryptionCompliant: encResult.compliant,
      accessBoundaryCompliant: accessCompliant,
      auditTrailComplete: auditComplete,
      findings,
    };
  }

  /* ─── Audit Log ─── */

  recordEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): SecurityAuditEvent {
    const full: SecurityAuditEvent = { ...event, id: uuid(), timestamp: new Date() };
    this.auditLog.push(full);
    return full;
  }

  getEventsByTenant(tenantId: string, limit = 100): SecurityAuditEvent[] {
    return this.auditLog.filter((e) => e.tenantId === tenantId).slice(-limit);
  }

  getEventsByType(type: SecurityEventType, limit = 100): SecurityAuditEvent[] {
    return this.auditLog.filter((e) => e.type === type).slice(-limit);
  }

  getCriticalEvents(limit = 50): SecurityAuditEvent[] {
    return this.auditLog.filter((e) => e.severity === 'critical').slice(-limit);
  }

  /* ─── Reset ─── */

  reset(): void {
    this.encryptionPolicies.clear();
    this.accessBoundaries.clear();
    this.auditLog = [];
  }
}

/* ─── Helpers ─── */

function ipMatchesCIDR(ip: string, cidr: string): boolean {
  // Simple CIDR matching for IPv4
  if (!cidr.includes('/')) return ip === cidr;
  const [base, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0;
  const ipNum = ipToNum(ip);
  const baseNum = ipToNum(base);
  return (ipNum & mask) === (baseNum & mask);
}

function ipToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/* ─── Singleton ─── */

let _instance: SecurityControlsService | null = null;

export function getSecurityControlsService(): SecurityControlsService {
  if (!_instance) _instance = new SecurityControlsService();
  return _instance;
}

export function resetSecurityControlsForTest(): void {
  if (_instance) _instance.reset();
  _instance = null;
}
