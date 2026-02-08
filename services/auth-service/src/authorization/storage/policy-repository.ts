/**
 * Policy Repository
 * 
 * MongoDB-based storage for authorization policies with versioning
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { Policy } from '../engine/types';
import {
  StoredPolicy,
  PolicyVersion,
  PolicyListOptions,
  PolicyListResult,
  IPolicyRepository,
} from './types';

export class PolicyRepository implements IPolicyRepository {
  private policiesCollection: Collection<StoredPolicy>;
  private versionsCollection: Collection<PolicyVersion>;

  constructor(db: Db) {
    this.policiesCollection = db.collection('policies');
    this.versionsCollection = db.collection('policy_versions');
  }

  /**
   * Initialize indexes
   */
  async initialize(): Promise<void> {
    // Policies indexes
    await this.policiesCollection.createIndex({ tenant_id: 1, is_active: 1 });
    await this.policiesCollection.createIndex({ name: 1, tenant_id: 1 }, { unique: true });
    await this.policiesCollection.createIndex({ 'metadata.tags': 1 });
    await this.policiesCollection.createIndex({ priority: -1 });

    // Versions indexes
    await this.versionsCollection.createIndex({ policy_id: 1, version: -1 });
  }

  /**
   * Create a new policy
   */
  async create(
    policy: Omit<StoredPolicy, '_id' | 'version' | 'metadata'>,
    createdBy: string
  ): Promise<StoredPolicy> {
    const now = new Date();
    const storedPolicy: StoredPolicy = {
      ...policy,
      version: 1,
      metadata: {
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      },
    };

    const result = await this.policiesCollection.insertOne(storedPolicy as any);
    storedPolicy._id = result.insertedId.toString();

    // Create initial version
    await this.createVersion(storedPolicy._id, storedPolicy, createdBy, 'Initial creation');

    return storedPolicy;
  }

  /**
   * Find policy by ID
   */
  async findById(id: string): Promise<StoredPolicy | null> {
    return await this.policiesCollection.findOne({ _id: new ObjectId(id) } as any);
  }

  /**
   * Find policies by tenant
   */
  async findByTenant(
    tenantId: string | null,
    options: PolicyListOptions = {}
  ): Promise<PolicyListResult> {
    const { filters = {}, sort, limit = 50, offset = 0 } = options;

    // Build query
    const query: any = {
      $or: [{ tenant_id: tenantId }, { tenant_id: null }], // Include global policies
    };

    if (filters.is_active !== undefined) {
      query.is_active = filters.is_active;
    }

    if (filters.effect) {
      query.effect = filters.effect;
    }

    if (filters.tags && filters.tags.length > 0) {
      query['metadata.tags'] = { $in: filters.tags };
    }

    if (filters.created_after || filters.created_before) {
      query['metadata.created_at'] = {};
      if (filters.created_after) {
        query['metadata.created_at'].$gte = filters.created_after;
      }
      if (filters.created_before) {
        query['metadata.created_at'].$lte = filters.created_before;
      }
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Build sort
    const sortOptions: any = {};
    if (sort) {
      sortOptions[`metadata.${sort.field}`] = sort.order === 'asc' ? 1 : -1;
    } else {
      sortOptions.priority = -1; // Default: highest priority first
    }

    // Execute query
    const [policies, total] = await Promise.all([
      this.policiesCollection
        .find(query)
        .sort(sortOptions)
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.policiesCollection.countDocuments(query),
    ]);

    return {
      policies,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update a policy
   */
  async update(
    id: string,
    updates: Partial<Policy>,
    updatedBy: string,
    changeReason?: string
  ): Promise<StoredPolicy> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    const now = new Date();
    const newVersion = existing.version + 1;

    const updated: StoredPolicy = {
      ...existing,
      ...updates,
      version: newVersion,
      metadata: {
        ...existing.metadata,
        updated_at: now,
        updated_by: updatedBy,
      },
    };

    await this.policiesCollection.updateOne(
      { _id: new ObjectId(id) } as any,
      { $set: updated }
    );

    // Create version entry
    await this.createVersion(id, updated, updatedBy, changeReason || 'Policy updated');

    return updated;
  }

  /**
   * Delete a policy
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.policiesCollection.deleteOne({ _id: new ObjectId(id) } as any);
    return result.deletedCount > 0;
  }

  /**
   * Activate a policy
   */
  async activate(id: string): Promise<boolean> {
    const result = await this.policiesCollection.updateOne(
      { _id: new ObjectId(id) } as any,
      { $set: { is_active: true, 'metadata.updated_at': new Date() } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Deactivate a policy
   */
  async deactivate(id: string): Promise<boolean> {
    const result = await this.policiesCollection.updateOne(
      { _id: new ObjectId(id) } as any,
      { $set: { is_active: false, 'metadata.updated_at': new Date() } }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get version history
   */
  async getVersionHistory(policyId: string): Promise<PolicyVersion[]> {
    return await this.versionsCollection
      .find({ policy_id: policyId })
      .sort({ version: -1 })
      .toArray();
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    policyId: string,
    version: number,
    rolledBackBy: string
  ): Promise<StoredPolicy> {
    const versionEntry = await this.versionsCollection.findOne({
      policy_id: policyId,
      version,
    });

    if (!versionEntry) {
      throw new Error(`Version ${version} not found for policy ${policyId}`);
    }

    return await this.update(
      policyId,
      versionEntry.policy,
      rolledBackBy,
      `Rolled back to version ${version}`
    );
  }

  /**
   * Get applicable policies for evaluation
   */
  async getApplicablePolicies(tenantId: string | null): Promise<StoredPolicy[]> {
    return await this.policiesCollection
      .find({
        $or: [{ tenant_id: tenantId }, { tenant_id: null }],
        is_active: true,
      })
      .sort({ priority: -1 })
      .toArray();
  }

  /**
   * Create a version entry
   */
  private async createVersion(
    policyId: string,
    policy: StoredPolicy,
    changedBy: string,
    changeReason: string
  ): Promise<void> {
    const version: PolicyVersion = {
      policy_id: policyId,
      version: policy.version,
      policy: {
        name: policy.name,
        description: policy.description,
        effect: policy.effect,
        priority: policy.priority,
        target: policy.target,
        conditions: policy.conditions,
      },
      metadata: policy.metadata,
      change_reason: changeReason,
      changed_by: changedBy,
      changed_at: new Date(),
    };

    await this.versionsCollection.insertOne(version as any);
  }
}
