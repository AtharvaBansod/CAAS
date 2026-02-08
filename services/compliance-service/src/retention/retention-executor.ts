/**
 * Retention Executor
 * 
 * Executes retention policies with batch processing
 */

import { Db } from 'mongodb';
import { RetentionPolicy, RetentionResult } from './types';

export class RetentionExecutor {
  private batchSize: number;

  constructor(private db: Db, batchSize: number = 1000) {
    this.batchSize = batchSize;
  }

  /**
   * Execute retention policy
   */
  async executePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
    const result: RetentionResult = {
      policy_id: policy._id!,
      data_type: policy.data_type,
      records_processed: 0,
      records_deleted: 0,
      records_archived: 0,
      records_anonymized: 0,
      started_at: new Date(),
      completed_at: new Date(),
      errors: [],
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

      const collectionName = this.getCollectionName(policy.data_type);

      switch (policy.action) {
        case 'delete':
          result.records_deleted = await this.deleteRecords(
            collectionName,
            policy.tenant_id,
            cutoffDate
          );
          break;
        case 'archive':
          result.records_archived = await this.archiveRecords(
            collectionName,
            policy.tenant_id,
            cutoffDate
          );
          break;
        case 'anonymize':
          result.records_anonymized = await this.anonymizeRecords(
            collectionName,
            policy.tenant_id,
            cutoffDate
          );
          break;
      }

      result.records_processed =
        result.records_deleted + result.records_archived + result.records_anonymized;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    result.completed_at = new Date();
    return result;
  }

  /**
   * Delete records
   */
  private async deleteRecords(
    collection: string,
    tenantId: string,
    cutoffDate: Date
  ): Promise<number> {
    const result = await this.db.collection(collection).deleteMany({
      tenant_id: tenantId,
      created_at: { $lt: cutoffDate },
    });

    return result.deletedCount || 0;
  }

  /**
   * Archive records (move to archive collection)
   */
  private async archiveRecords(
    collection: string,
    tenantId: string,
    cutoffDate: Date
  ): Promise<number> {
    const records = await this.db
      .collection(collection)
      .find({
        tenant_id: tenantId,
        created_at: { $lt: cutoffDate },
      })
      .toArray();

    if (records.length === 0) {
      return 0;
    }

    // Insert into archive collection
    await this.db.collection(`${collection}_archive`).insertMany(records);

    // Delete from original collection
    await this.db.collection(collection).deleteMany({
      _id: { $in: records.map(r => r._id) },
    });

    return records.length;
  }

  /**
   * Anonymize records
   */
  private async anonymizeRecords(
    collection: string,
    tenantId: string,
    cutoffDate: Date
  ): Promise<number> {
    const result = await this.db.collection(collection).updateMany(
      {
        tenant_id: tenantId,
        created_at: { $lt: cutoffDate },
      },
      {
        $set: {
          anonymized: true,
          user_id: 'ANONYMIZED',
          email: 'anonymized@example.com',
          name: 'Anonymized User',
        },
      }
    );

    return result.modifiedCount || 0;
  }

  /**
   * Get collection name for data type
   */
  private getCollectionName(dataType: string): string {
    const mapping: Record<string, string> = {
      messages: 'messages',
      files: 'files',
      logs: 'logs',
      analytics: 'analytics_events',
      sessions: 'user_sessions',
      audit_logs: 'security_audit_logs',
    };

    return mapping[dataType] || dataType;
  }
}
