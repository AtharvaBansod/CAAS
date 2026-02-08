/**
 * Retention Policy Service
 * 
 * Manages data retention policies
 */

import { Db } from 'mongodb';
import { RetentionPolicy, DataType, RetentionAction } from './types';

export interface CreateRetentionPolicyDTO {
  tenant_id: string;
  data_type: DataType;
  retention_days: number;
  action: RetentionAction;
  created_by: string;
}

export class RetentionPolicyService {
  constructor(private db: Db) {}

  /**
   * Create retention policy
   */
  async createPolicy(dto: CreateRetentionPolicyDTO): Promise<RetentionPolicy> {
    // Validate retention days
    if (dto.retention_days < 1) {
      throw new Error('Retention days must be at least 1');
    }

    // Check minimum retention for audit logs (compliance requirement)
    if (dto.data_type === 'audit_logs' && dto.retention_days < 365) {
      throw new Error('Audit logs must be retained for at least 365 days');
    }

    const policy: RetentionPolicy = {
      ...dto,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await this.db.collection('retention_policies').insertOne(policy as any);
    policy._id = result.insertedId.toString();

    return policy;
  }

  /**
   * Update retention policy
   */
  async updatePolicy(
    id: string,
    updates: Partial<RetentionPolicy>
  ): Promise<RetentionPolicy> {
    const existing = await this.getPolicy(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    // Validate updates
    if (updates.retention_days !== undefined && updates.retention_days < 1) {
      throw new Error('Retention days must be at least 1');
    }

    if (existing.data_type === 'audit_logs' && updates.retention_days && updates.retention_days < 365) {
      throw new Error('Audit logs must be retained for at least 365 days');
    }

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date(),
    };

    await this.db.collection('retention_policies').updateOne(
      { _id: id } as any,
      { $set: updated }
    );

    return updated;
  }

  /**
   * Delete retention policy
   */
  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.db.collection('retention_policies').deleteOne({ _id: id } as any);
    return (result.deletedCount || 0) > 0;
  }

  /**
   * Get retention policy by ID
   */
  async getPolicy(id: string): Promise<RetentionPolicy | null> {
    return await this.db.collection('retention_policies').findOne({ _id: id } as any);
  }

  /**
   * Get all policies for tenant
   */
  async getPolicies(tenantId: string): Promise<RetentionPolicy[]> {
    return await this.db
      .collection('retention_policies')
      .find({ tenant_id: tenantId })
      .toArray();
  }

  /**
   * Get active policies
   */
  async getActivePolicies(tenantId?: string): Promise<RetentionPolicy[]> {
    const query: any = { is_active: true };
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    return await this.db.collection('retention_policies').find(query).toArray();
  }

  /**
   * Get policy for data type
   */
  async getPolicyForDataType(
    tenantId: string,
    dataType: DataType
  ): Promise<RetentionPolicy | null> {
    return await this.db.collection('retention_policies').findOne({
      tenant_id: tenantId,
      data_type: dataType,
      is_active: true,
    });
  }

  /**
   * Preview policy effect (estimate records to be affected)
   */
  async previewPolicy(policyId: string): Promise<{
    policy: RetentionPolicy;
    estimated_records: number;
    cutoff_date: Date;
  }> {
    const policy = await this.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    // Estimate records (simplified - in production, query actual collections)
    const collectionName = this.getCollectionName(policy.data_type);
    const estimatedRecords = await this.db.collection(collectionName).countDocuments({
      tenant_id: policy.tenant_id,
      created_at: { $lt: cutoffDate },
    });

    return {
      policy,
      estimated_records: estimatedRecords,
      cutoff_date: cutoffDate,
    };
  }

  /**
   * Get collection name for data type
   */
  private getCollectionName(dataType: DataType): string {
    const mapping: Record<DataType, string> = {
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
