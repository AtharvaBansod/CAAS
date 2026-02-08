/**
 * Authorization Audit Storage
 * 
 * MongoDB storage for authorization audit logs
 */

import { Collection, Db } from 'mongodb';
import { AuthzAuditEntry, PolicyChangeEntry, RoleChangeEntry, AuditQueryFilters, AuditQueryResult } from './types';

export class AuditStorage {
  private decisionsCollection: Collection<AuthzAuditEntry>;
  private policyChangesCollection: Collection<PolicyChangeEntry>;
  private roleChangesCollection: Collection<RoleChangeEntry>;

  constructor(db: Db) {
    this.decisionsCollection = db.collection('authz_audit_logs');
    this.policyChangesCollection = db.collection('authz_policy_changes');
    this.roleChangesCollection = db.collection('authz_role_changes');
  }

  /**
   * Initialize indexes
   */
  async initialize(): Promise<void> {
    // Decision logs indexes
    await this.decisionsCollection.createIndex({ tenant_id: 1, timestamp: -1 });
    await this.decisionsCollection.createIndex({ 'subject.user_id': 1, timestamp: -1 });
    await this.decisionsCollection.createIndex({ decision: 1, timestamp: -1 });
    await this.decisionsCollection.createIndex({ 'resource.type': 1, timestamp: -1 });
    await this.decisionsCollection.createIndex({ timestamp: -1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

    // Policy changes indexes
    await this.policyChangesCollection.createIndex({ policy_id: 1, timestamp: -1 });
    await this.policyChangesCollection.createIndex({ actor: 1, timestamp: -1 });

    // Role changes indexes
    await this.roleChangesCollection.createIndex({ user_id: 1, timestamp: -1 });
    await this.roleChangesCollection.createIndex({ actor: 1, timestamp: -1 });
  }

  /**
   * Store authorization decision
   */
  async storeDecision(entry: AuthzAuditEntry): Promise<void> {
    await this.decisionsCollection.insertOne(entry as any);
  }

  /**
   * Store policy change
   */
  async storePolicyChange(entry: PolicyChangeEntry): Promise<void> {
    await this.policyChangesCollection.insertOne(entry as any);
  }

  /**
   * Store role change
   */
  async storeRoleChange(entry: RoleChangeEntry): Promise<void> {
    await this.roleChangesCollection.insertOne(entry as any);
  }

  /**
   * Query authorization decisions
   */
  async queryDecisions(
    filters: AuditQueryFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditQueryResult> {
    const query: any = {};

    if (filters.tenant_id) query.tenant_id = filters.tenant_id;
    if (filters.user_id) query['subject.user_id'] = filters.user_id;
    if (filters.resource_type) query['resource.type'] = filters.resource_type;
    if (filters.resource_id) query['resource.id'] = filters.resource_id;
    if (filters.action) query.action = filters.action;
    if (filters.decision) query.decision = filters.decision;

    if (filters.start_date || filters.end_date) {
      query.timestamp = {};
      if (filters.start_date) query.timestamp.$gte = filters.start_date;
      if (filters.end_date) query.timestamp.$lte = filters.end_date;
    }

    const [entries, total] = await Promise.all([
      this.decisionsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      this.decisionsCollection.countDocuments(query),
    ]);

    return {
      entries,
      total,
      limit,
      offset,
    };
  }

  /**
   * Count recent denies for user
   */
  async countRecentDenies(userId: string, timeWindowMs: number): Promise<number> {
    const since = new Date(Date.now() - timeWindowMs);
    return await this.decisionsCollection.countDocuments({
      'subject.user_id': userId,
      decision: 'deny',
      timestamp: { $gte: since },
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(filters: AuditQueryFilters): Promise<any> {
    const query: any = {};
    if (filters.tenant_id) query.tenant_id = filters.tenant_id;
    if (filters.start_date || filters.end_date) {
      query.timestamp = {};
      if (filters.start_date) query.timestamp.$gte = filters.start_date;
      if (filters.end_date) query.timestamp.$lte = filters.end_date;
    }

    const [stats] = await this.decisionsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          allows: { $sum: { $cond: [{ $eq: ['$decision', 'allow'] }, 1, 0] } },
          denies: { $sum: { $cond: [{ $eq: ['$decision', 'deny'] }, 1, 0] } },
          avg_duration: { $avg: '$duration_ms' },
          cache_hits: { $sum: { $cond: ['$cache_hit', 1, 0] } },
        },
      },
    ]).toArray();

    if (!stats) {
      return {
        total_decisions: 0,
        allow_count: 0,
        deny_count: 0,
        allow_rate: 0,
        deny_rate: 0,
        avg_duration_ms: 0,
        cache_hit_rate: 0,
      };
    }

    return {
      total_decisions: stats.total,
      allow_count: stats.allows,
      deny_count: stats.denies,
      allow_rate: stats.total > 0 ? stats.allows / stats.total : 0,
      deny_rate: stats.total > 0 ? stats.denies / stats.total : 0,
      avg_duration_ms: stats.avg_duration,
      cache_hit_rate: stats.total > 0 ? stats.cache_hits / stats.total : 0,
    };
  }
}
