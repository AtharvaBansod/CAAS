/**
 * Audit Repository
 * Phase 4.5.0 - Task 05: Centralized Storage & Consistency
 * 
 * Immutable audit trail with hash chain for tamper detection
 */

import { MongoDBConnection } from '../storage/mongodb-connection';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface AuditLog {
  audit_id: string;
  user_id?: string;
  tenant_id: string;
  session_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  hash_chain: string;
  previous_hash: string;
  created_at: Date;
}

export class AuditRepository {
  private readonly COLLECTION = 'audit_logs';
  private lastHash: string = '';

  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    const db = MongoDBConnection.getDb();

    // Get the last hash if not loaded
    if (!this.lastHash) {
      await this.loadLastHash();
    }

    const auditLog: AuditLog = {
      audit_id: uuidv4(),
      user_id: data.user_id,
      tenant_id: data.tenant_id!,
      session_id: data.session_id,
      action: data.action!,
      resource_type: data.resource_type,
      resource_id: data.resource_id,
      metadata: data.metadata,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      previous_hash: this.lastHash,
      hash_chain: '',
      created_at: new Date(),
    };

    // Calculate hash chain
    auditLog.hash_chain = this.calculateHash(auditLog);
    this.lastHash = auditLog.hash_chain;

    // Insert into database (immutable - no updates allowed)
    await db.collection(this.COLLECTION).insertOne(auditLog);

    return auditLog;
  }

  private calculateHash(log: AuditLog): string {
    const data = JSON.stringify({
      audit_id: log.audit_id,
      user_id: log.user_id,
      tenant_id: log.tenant_id,
      session_id: log.session_id,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      metadata: log.metadata,
      previous_hash: log.previous_hash,
      created_at: log.created_at.toISOString(),
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async loadLastHash(): Promise<void> {
    const db = MongoDBConnection.getDb();

    const lastLog = await db
      .collection(this.COLLECTION)
      .find({})
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    if (lastLog.length > 0) {
      this.lastHash = (lastLog[0] as any).hash_chain;
    } else {
      this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  async findByUserId(user_id: string, limit: number = 100): Promise<AuditLog[]> {
    const db = MongoDBConnection.getDb();

    const logs = await db
      .collection(this.COLLECTION)
      .find({ user_id })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return logs as any[];
  }

  async findByTenantId(tenant_id: string, limit: number = 100): Promise<AuditLog[]> {
    const db = MongoDBConnection.getDb();

    const logs = await db
      .collection(this.COLLECTION)
      .find({ tenant_id })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return logs as any[];
  }

  async findByAction(action: string, limit: number = 100): Promise<AuditLog[]> {
    const db = MongoDBConnection.getDb();

    const logs = await db
      .collection(this.COLLECTION)
      .find({ action })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return logs as any[];
  }

  async verifyHashChain(startDate?: Date, endDate?: Date): Promise<boolean> {
    const db = MongoDBConnection.getDb();

    const query: any = {};
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = startDate;
      if (endDate) query.created_at.$lte = endDate;
    }

    const logs = await db
      .collection(this.COLLECTION)
      .find(query)
      .sort({ created_at: 1 })
      .toArray();

    let previousHash = '';
    for (const log of logs) {
      const auditLog = log as any as AuditLog;

      // Verify previous hash matches
      if (auditLog.previous_hash !== previousHash) {
        console.error(`Hash chain broken at audit_id: ${auditLog.audit_id}`);
        return false;
      }

      // Verify current hash
      const calculatedHash = this.calculateHash(auditLog);
      if (calculatedHash !== auditLog.hash_chain) {
        console.error(`Hash mismatch at audit_id: ${auditLog.audit_id}`);
        return false;
      }

      previousHash = auditLog.hash_chain;
    }

    return true;
  }

  async ensureIndexes(): Promise<void> {
    const db = MongoDBConnection.getDb();
    const collection = db.collection(this.COLLECTION);

    await collection.createIndex({ audit_id: 1 }, { unique: true });
    await collection.createIndex({ user_id: 1, created_at: -1 });
    await collection.createIndex({ tenant_id: 1, created_at: -1 });
    await collection.createIndex({ session_id: 1 });
    await collection.createIndex({ action: 1, created_at: -1 });
    await collection.createIndex({ created_at: -1 });
  }
}
