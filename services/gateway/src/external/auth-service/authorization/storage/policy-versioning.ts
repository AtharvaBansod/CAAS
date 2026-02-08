/**
 * Policy Versioning
 * Track policy version history and enable rollback
 */

import { Db, ObjectId } from 'mongodb';
import { Policy } from '../engine/types';

export interface PolicyVersion {
  _id: ObjectId;
  policy_id: string;
  version: number;
  policy_data: Policy;
  changed_by: string;
  changed_at: Date;
  change_description?: string;
  previous_version?: number;
}

export interface VersionComparison {
  added_conditions: any[];
  removed_conditions: any[];
  modified_fields: string[];
}

export class PolicyVersioning {
  private collection: string = 'policy_versions';

  constructor(private db: Db) { }

  /**
   * Create a new version when policy is updated
   */
  async createVersion(
    policyId: string,
    policy: Policy,
    changedBy: string,
    changeDescription?: string
  ): Promise<PolicyVersion> {
    // Get current version number
    const latestVersion = await this.getLatestVersion(policyId);
    const newVersion = latestVersion ? latestVersion.version + 1 : 1;

    const versionEntry: Omit<PolicyVersion, '_id'> = {
      policy_id: policyId,
      version: newVersion,
      policy_data: policy,
      changed_by: changedBy,
      changed_at: new Date(),
      change_description: changeDescription,
      previous_version: latestVersion?.version,
    };

    const result = await this.db.collection(this.collection).insertOne(versionEntry);

    return {
      _id: result.insertedId,
      ...versionEntry,
    } as PolicyVersion;
  }

  /**
   * Get latest version of a policy
   */
  async getLatestVersion(policyId: string): Promise<PolicyVersion | null> {
    const version = await this.db
      .collection(this.collection)
      .findOne(
        { policy_id: policyId },
        { sort: { version: -1 } }
      );

    return version as PolicyVersion | null;
  }

  /**
   * Get specific version of a policy
   */
  async getVersion(policyId: string, version: number): Promise<PolicyVersion | null> {
    const versionEntry = await this.db
      .collection(this.collection)
      .findOne({ policy_id: policyId, version });

    return versionEntry as PolicyVersion | null;
  }

  /**
   * Get all versions of a policy
   */
  async getVersionHistory(policyId: string): Promise<PolicyVersion[]> {
    const versions = await this.db
      .collection(this.collection)
      .find({ policy_id: policyId })
      .sort({ version: -1 })
      .toArray();

    return versions as PolicyVersion[];
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    policyId: string,
    targetVersion: number,
    rolledBackBy: string
  ): Promise<Policy> {
    const targetVersionEntry = await this.getVersion(policyId, targetVersion);

    if (!targetVersionEntry) {
      throw new Error(`Version ${targetVersion} not found for policy ${policyId}`);
    }

    // Create a new version with the old policy data
    await this.createVersion(
      policyId,
      targetVersionEntry.policy_data,
      rolledBackBy,
      `Rolled back to version ${targetVersion}`
    );

    return targetVersionEntry.policy_data;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    policyId: string,
    version1: number,
    version2: number
  ): Promise<VersionComparison> {
    const v1 = await this.getVersion(policyId, version1);
    const v2 = await this.getVersion(policyId, version2);

    if (!v1 || !v2) {
      throw new Error('One or both versions not found');
    }

    const comparison: VersionComparison = {
      added_conditions: [],
      removed_conditions: [],
      modified_fields: [],
    };

    // Compare conditions
    const v1Conditions = new Set(v1.policy_data.conditions?.map(c => JSON.stringify(c)) || []);
    const v2Conditions = new Set(v2.policy_data.conditions?.map(c => JSON.stringify(c)) || []);

    v2Conditions.forEach(c => {
      if (!v1Conditions.has(c)) {
        comparison.added_conditions.push(JSON.parse(c));
      }
    });

    v1Conditions.forEach(c => {
      if (!v2Conditions.has(c)) {
        comparison.removed_conditions.push(JSON.parse(c));
      }
    });

    // Compare other fields
    const fields = ['name', 'description', 'effect', 'priority', 'is_active'];
    fields.forEach(field => {
      const val1 = (v1.policy_data as any)[field];
      const val2 = (v2.policy_data as any)[field];
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        comparison.modified_fields.push(field);
      }
    });

    return comparison;
  }

  /**
   * Delete version history for a policy
   */
  async deleteVersionHistory(policyId: string): Promise<number> {
    const result = await this.db
      .collection(this.collection)
      .deleteMany({ policy_id: policyId });

    return result.deletedCount;
  }

  /**
   * Cleanup old versions (keep last N versions)
   */
  async cleanupOldVersions(policyId: string, keepCount: number = 10): Promise<number> {
    const versions = await this.getVersionHistory(policyId);

    if (versions.length <= keepCount) {
      return 0;
    }

    const versionsToDelete = versions.slice(keepCount);
    const versionNumbers = versionsToDelete.map(v => v.version);

    const result = await this.db
      .collection(this.collection)
      .deleteMany({
        policy_id: policyId,
        version: { $in: versionNumbers },
      });

    return result.deletedCount;
  }
}
