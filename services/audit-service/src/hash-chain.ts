/**
 * Hash Chain for Audit Log Immutability
 * Creates a blockchain-like chain to detect tampering
 */

import { createHash } from 'crypto';
import { AuditEntry } from './types';

export class HashChain {
  /**
   * Calculate hash for audit entry
   */
  calculateHash(entry: AuditEntry): string {
    const data = JSON.stringify({
      audit_id: entry.audit_id,
      tenant_id: entry.tenant_id,
      event_type: entry.event_type,
      actor: entry.actor,
      target: entry.target,
      action: entry.action,
      result: entry.result,
      timestamp: entry.timestamp.toISOString(),
      previous_hash: entry.previous_hash || '',
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify hash chain integrity
   */
  verifyChain(entries: AuditEntry[]): {
    valid: boolean;
    broken_at?: number;
    error?: string;
  } {
    if (entries.length === 0) {
      return { valid: true };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify current entry hash
      const calculatedHash = this.calculateHash(entry);
      if (calculatedHash !== entry.hash) {
        return {
          valid: false,
          broken_at: i,
          error: `Hash mismatch at entry ${i}`,
        };
      }

      // Verify link to previous entry
      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previous_hash !== previousEntry.hash) {
          return {
            valid: false,
            broken_at: i,
            error: `Chain broken at entry ${i}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get chain summary
   */
  getChainSummary(entries: AuditEntry[]): {
    length: number;
    first_hash?: string;
    last_hash?: string;
    is_valid: boolean;
  } {
    if (entries.length === 0) {
      return {
        length: 0,
        is_valid: true,
      };
    }

    const verification = this.verifyChain(entries);

    return {
      length: entries.length,
      first_hash: entries[0].hash,
      last_hash: entries[entries.length - 1].hash,
      is_valid: verification.valid,
    };
  }
}

export const hashChain = new HashChain();
