/**
 * FDB-CONN-002 — Credential Lifecycle & Secret Management
 *
 * - Credentials never stored in plaintext.
 * - Short-lived credential/session token support.
 * - Audit logging for credential create/update/revoke.
 * - Rotation without service restart.
 */

import { v4 as uuid } from 'uuid';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ProviderId, AuthMode, CredentialRecord } from '../types';
import { CredentialExpiredError } from '../errors';

const ALGORITHM = 'aes-256-gcm';

/* ─── Credential Manager ─── */

export class CredentialManager {
  private credentials = new Map<string, CredentialRecord>();
  private encryptionKey: Buffer;
  private auditLog: CredentialAuditEntry[] = [];

  constructor(masterKeyHex?: string) {
    // 256-bit key — in production from KMS / env secret
    this.encryptionKey = masterKeyHex
      ? Buffer.from(masterKeyHex, 'hex')
      : randomBytes(32);
  }

  /* ── store ── */

  store(
    profileId: string,
    tenantId: string,
    provider: ProviderId,
    authMode: AuthMode,
    rawCredential: string,
    opts?: { expiresAt?: string; actor?: string },
  ): CredentialRecord {
    const encrypted = this.encrypt(rawCredential);
    const now = new Date().toISOString();
    const record: CredentialRecord = {
      id: uuid(),
      profileId,
      tenantId,
      provider,
      authMode,
      encryptedPayload: encrypted,
      expiresAt: opts?.expiresAt,
      rotatedAt: undefined,
      createdAt: now,
      version: 1,
    };

    this.credentials.set(record.id, record);
    this.recordAudit(tenantId, 'create', record.id, opts?.actor ?? 'system');
    return record;
  }

  /* ── retrieve (decrypted, for internal use only) ── */

  retrieve(credentialId: string): string {
    const record = this.credentials.get(credentialId);
    if (!record) throw new Error(`Credential ${credentialId} not found`);

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      throw new CredentialExpiredError(record.provider);
    }

    return this.decrypt(record.encryptedPayload);
  }

  /* ── rotate ── */

  rotate(
    credentialId: string,
    newRawCredential: string,
    actor?: string,
  ): CredentialRecord {
    const existing = this.credentials.get(credentialId);
    if (!existing) throw new Error(`Credential ${credentialId} not found`);

    const encrypted = this.encrypt(newRawCredential);
    const rotated: CredentialRecord = {
      ...existing,
      encryptedPayload: encrypted,
      rotatedAt: new Date().toISOString(),
      version: existing.version + 1,
    };

    this.credentials.set(credentialId, rotated);
    this.recordAudit(existing.tenantId, 'rotate', credentialId, actor ?? 'system');
    return rotated;
  }

  /* ── revoke ── */

  revoke(credentialId: string, actor?: string): boolean {
    const existing = this.credentials.get(credentialId);
    if (!existing) return false;

    this.recordAudit(existing.tenantId, 'revoke', credentialId, actor ?? 'system');
    return this.credentials.delete(credentialId);
  }

  /* ── queries ── */

  getByProfile(profileId: string): CredentialRecord | undefined {
    return Array.from(this.credentials.values()).find((c) => c.profileId === profileId);
  }

  getByTenant(tenantId: string): CredentialRecord[] {
    return Array.from(this.credentials.values()).filter((c) => c.tenantId === tenantId);
  }

  getRecord(credentialId: string): CredentialRecord | undefined {
    return this.credentials.get(credentialId);
  }

  /* ── audit ── */

  getAuditLog(tenantId?: string): CredentialAuditEntry[] {
    if (tenantId) return this.auditLog.filter((e) => e.tenantId === tenantId);
    return [...this.auditLog];
  }

  /* ── encryption helpers ── */

  private encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  private decrypt(payload: string): string {
    const [ivHex, tagHex, encrypted] = payload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private recordAudit(
    tenantId: string,
    action: 'create' | 'rotate' | 'revoke',
    credentialId: string,
    actor: string,
  ): void {
    this.auditLog.push({
      id: uuid(),
      timestamp: new Date().toISOString(),
      tenantId,
      action,
      credentialId,
      actor,
    });
  }
}

export interface CredentialAuditEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  action: 'create' | 'rotate' | 'revoke';
  credentialId: string;
  actor: string;
}

/* ─── Singleton ─── */

let _credMgr: CredentialManager | undefined;

export function getCredentialManager(): CredentialManager {
  if (!_credMgr) _credMgr = new CredentialManager(process.env.FDB_MASTER_KEY);
  return _credMgr;
}

export function resetCredentialManagerForTest(): void {
  _credMgr = undefined;
}
