/**
 * Audit Storage
 * Stores audit logs in MongoDB with TTL and streams to Kafka
 */

import { randomBytes } from 'crypto';
import { hashChain } from './hash-chain';
import { AuditEntry, AuditFilter, AuditQueryResult } from './types';

export class AuditStorage {
  private entries: Map<string, AuditEntry> = new Map();
  private lastHash: string | undefined;

  /**
   * Store audit entry
   */
  async store(entry: Omit<AuditEntry, 'audit_id' | 'hash' | 'previous_hash' | 'created_at'>): Promise<AuditEntry> {
    const auditEntry: AuditEntry = {
      ...entry,
      audit_id: randomBytes(16).toString('hex'),
      previous_hash: this.lastHash,
      created_at: new Date(),
      hash: '', // Will be calculated
    };

    // Calculate hash
    auditEntry.hash = hashChain.calculateHash(auditEntry);
    this.lastHash = auditEntry.hash;

    // Store in memory (in production, store in MongoDB)
    this.entries.set(auditEntry.audit_id, auditEntry);

    // Stream to Kafka (in production)
    await this.streamToKafka(auditEntry);

    return auditEntry;
  }

  /**
   * Query audit logs
   */
  async query(filter: AuditFilter): Promise<AuditQueryResult> {
    let entries = Array.from(this.entries.values());

    // Apply filters
    if (filter.tenant_id) {
      entries = entries.filter(e => e.tenant_id === filter.tenant_id);
    }
    if (filter.event_type) {
      entries = entries.filter(e => e.event_type === filter.event_type);
    }
    if (filter.actor_user_id) {
      entries = entries.filter(e => e.actor.user_id === filter.actor_user_id);
    }
    if (filter.target_type) {
      entries = entries.filter(e => e.target.type === filter.target_type);
    }
    if (filter.result) {
      entries = entries.filter(e => e.result === filter.result);
    }
    if (filter.start_date) {
      entries = entries.filter(e => e.timestamp >= filter.start_date!);
    }
    if (filter.end_date) {
      entries = entries.filter(e => e.timestamp <= filter.end_date!);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = entries.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    const paginatedEntries = entries.slice(offset, offset + limit);

    return {
      entries: paginatedEntries,
      total,
      has_more: offset + limit < total,
    };
  }

  /**
   * Stream to Kafka
   */
  private async streamToKafka(entry: AuditEntry): Promise<void> {
    // TODO: Implement Kafka streaming
    console.log(`Streaming audit event to Kafka: ${entry.event_type}`);
  }

  /**
   * Get entry by ID
   */
  async getById(auditId: string): Promise<AuditEntry | null> {
    return this.entries.get(auditId) || null;
  }

  /**
   * Verify chain integrity
   */
  async verifyIntegrity(tenantId: string): Promise<boolean> {
    const entries = Array.from(this.entries.values())
      .filter(e => e.tenant_id === tenantId)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    const result = hashChain.verifyChain(entries);
    return result.valid;
  }
}

export const auditStorage = new AuditStorage();
