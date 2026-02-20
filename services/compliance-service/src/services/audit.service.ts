import { Collection, ObjectId } from 'mongodb';
import { mongoConnection } from '../storage/mongodb-connection';
import { redisConnection } from '../storage/redis-connection';
import { HashChainService } from './hash-chain.service';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
  audit_id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata: Record<string, any>;
  hash: string;
  previous_hash: string;
  created_at: Date;
}

export class AuditService {
  private collection: Collection<AuditLog>;
  private hashChain: HashChainService;
  private batchBuffer: AuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.collection = mongoConnection.getDb().collection('audit_logs');
    this.hashChain = new HashChainService();
    this.startBatchFlushing();
  }

  /**
   * Log an audit event
   */
  public async log(event: Omit<AuditLog, 'audit_id' | 'hash' | 'previous_hash' | 'created_at'>): Promise<string> {
    const audit_id = uuidv4();
    const created_at = new Date();

    // Get previous hash from last audit log
    const previousHash = await this.getLastHash(event.tenant_id);

    // Calculate hash for this entry
    const hash = this.hashChain.calculateHash(
      {
        audit_id,
        tenant_id: event.tenant_id,
        user_id: event.user_id,
        action: event.action,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        metadata: event.metadata,
        created_at,
      },
      previousHash
    );

    const auditLog: AuditLog = {
      audit_id,
      ...event,
      hash,
      previous_hash: previousHash,
      created_at,
    };

    // Add to batch buffer
    this.batchBuffer.push(auditLog);

    // Flush if batch is full
    if (this.batchBuffer.length >= 100) {
      await this.flushBatch();
    }

    return audit_id;
  }

  /**
   * Query audit logs
   */
  public async query(filters: {
    tenant_id: string;
    user_id?: string;
    action?: string;
    resource_type?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    skip?: number;
  }): Promise<AuditLog[]> {
    const query: any = { tenant_id: filters.tenant_id };

    if (filters.user_id) query.user_id = filters.user_id;
    if (filters.action) query.action = filters.action;
    if (filters.resource_type) query.resource_type = filters.resource_type;

    if (filters.start_date || filters.end_date) {
      query.created_at = {};
      if (filters.start_date) query.created_at.$gte = filters.start_date;
      if (filters.end_date) query.created_at.$lte = filters.end_date;
    }

    return await this.collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(filters.limit || 100)
      .skip(filters.skip || 0)
      .toArray();
  }

  /**
   * Verify audit log integrity
   */
  public async verifyIntegrity(tenant_id: string, start_date?: Date, end_date?: Date): Promise<{
    valid: boolean;
    total_logs: number;
    verified_logs: number;
    errors: string[];
  }> {
    const query: any = { tenant_id };

    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = start_date;
      if (end_date) query.created_at.$lte = end_date;
    }

    const logs = await this.collection
      .find(query)
      .sort({ created_at: 1 })
      .toArray();

    const errors: string[] = [];
    let verified = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];

      // Verify hash
      const calculatedHash = this.hashChain.calculateHash(
        {
          audit_id: log.audit_id,
          tenant_id: log.tenant_id,
          user_id: log.user_id,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          metadata: log.metadata,
          created_at: log.created_at,
        },
        log.previous_hash
      );

      if (calculatedHash !== log.hash) {
        errors.push(`Hash mismatch at audit_id: ${log.audit_id}`);
        continue;
      }

      // Verify chain (if not first log)
      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previous_hash !== previousLog.hash) {
          errors.push(`Chain broken at audit_id: ${log.audit_id}`);
          continue;
        }
      }

      verified++;
    }

    return {
      valid: errors.length === 0,
      total_logs: logs.length,
      verified_logs: verified,
      errors,
    };
  }

  /**
   * Get last hash for tenant
   */
  private async getLastHash(tenant_id: string): Promise<string> {
    // Try cache first
    const redis = redisConnection.getClient();
    const cacheKey = `last_hash:${tenant_id}`;
    const cachedHash = await redis.get(cacheKey);

    if (cachedHash) {
      return cachedHash;
    }

    // Get from database
    const lastLog = await this.collection
      .findOne({ tenant_id }, { sort: { created_at: -1 } });

    const hash = lastLog ? lastLog.hash : this.hashChain.getGenesisHash();

    // Cache for 1 minute
    await redis.setex(cacheKey, 60, hash);

    return hash;
  }

  /**
   * Flush batch buffer to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.collection.insertMany(batch);

      // Update cache with last hash
      const redis = redisConnection.getClient();
      for (const log of batch) {
        await redis.setex(`last_hash:${log.tenant_id}`, 60, log.hash);
      }
    } catch (error) {
      console.error('Failed to flush audit batch:', error);
      // Re-add to buffer for retry
      this.batchBuffer.unshift(...batch);
    }
  }

  /**
   * Start batch flushing timer
   */
  private startBatchFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch().catch(console.error);
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Stop batch flushing and flush remaining
   */
  public async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushBatch();
  }
}
