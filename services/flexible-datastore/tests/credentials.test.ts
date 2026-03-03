/**
 * Tests for FDB-CONN-002: Credential Manager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCredentialManager, resetCredentialManagerForTest } from '../src/credentials';

describe('Credential Manager', () => {
  beforeEach(() => resetCredentialManagerForTest());

  it('should store and retrieve a credential', () => {
    const cm = getCredentialManager();
    const record = cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'mongodb://user:pass@host/db');
    expect(record.id).toBeDefined();
    const plaintext = cm.retrieve(record.id);
    expect(plaintext).toBe('mongodb://user:pass@host/db');
  });

  it('should encrypt credentials (stored encrypted)', () => {
    const cm = getCredentialManager();
    const record = cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'secret-value-123');
    expect(record.encryptedPayload).not.toBe('secret-value-123');
    expect(record.encryptedPayload).toContain(':'); // iv:tag:encrypted format
  });

  it('should rotate a credential', () => {
    const cm = getCredentialManager();
    const record = cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'old-secret');
    const rotated = cm.rotate(record.id, 'new-secret');
    expect(rotated.version).toBe(2);
    expect(cm.retrieve(record.id)).toBe('new-secret');
  });

  it('should revoke a credential', () => {
    const cm = getCredentialManager();
    const record = cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'to-revoke');
    const ok = cm.revoke(record.id);
    expect(ok).toBe(true);
    expect(() => cm.retrieve(record.id)).toThrow();
  });

  it('should throw for unknown credential', () => {
    const cm = getCredentialManager();
    expect(() => cm.retrieve('nonexistent')).toThrow();
  });

  it('should reject expired credentials', () => {
    const cm = getCredentialManager();
    const past = new Date(Date.now() - 60_000).toISOString();
    const record = cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'expired-secret', { expiresAt: past });
    expect(() => cm.retrieve(record.id)).toThrow();
  });

  it('should record audit log', () => {
    const cm = getCredentialManager();
    cm.store('prof-1', 't1', 'mongodb', 'connection_string', 'secret');
    const log = cm.getAuditLog('t1');
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].action).toBe('create');
  });
});
