/**
 * Resource Permission Service
 * 
 * Manages resource-level (instance-level) permissions
 */

import { Collection, Db } from 'mongodb';
import { ResourcePermission, GrantParams, RevokeParams, CheckParams } from './types';

export class ResourcePermissionService {
  private permissionsCollection: Collection<ResourcePermission>;

  constructor(db: Db) {
    this.permissionsCollection = db.collection('resource_permissions');
  }

  /**
   * Initialize indexes
   */
  async initialize(): Promise<void> {
    await this.permissionsCollection.createIndex(
      { user_id: 1, resource_type: 1, resource_id: 1 },
      { unique: true }
    );
    await this.permissionsCollection.createIndex({ resource_type: 1, resource_id: 1 });
    await this.permissionsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Grant permissions on resource
   */
  async grant(params: GrantParams): Promise<void> {
    const permission: ResourcePermission = {
      user_id: params.user_id,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      permissions: params.permissions,
      granted_by: params.granted_by,
      granted_at: new Date(),
      expires_at: params.expires_at,
    };

    await this.permissionsCollection.updateOne(
      {
        user_id: params.user_id,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
      },
      { $set: permission },
      { upsert: true }
    );
  }

  /**
   * Revoke permissions on resource
   */
  async revoke(params: RevokeParams): Promise<boolean> {
    const result = await this.permissionsCollection.deleteOne({
      user_id: params.user_id,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
    });
    return result.deletedCount > 0;
  }

  /**
   * Check if user has permission on resource
   */
  async check(params: CheckParams): Promise<boolean> {
    const permission = await this.permissionsCollection.findOne({
      user_id: params.user_id,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      permissions: params.permission,
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    } as any);

    return permission !== null;
  }

  /**
   * Get user permissions on resource
   */
  async getPermissions(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<string[]> {
    const permission = await this.permissionsCollection.findOne({
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    } as any);

    return permission?.permissions || [];
  }

  /**
   * Get all users with permissions on resource
   */
  async getResourceUsers(
    resourceType: string,
    resourceId: string
  ): Promise<Array<{ user_id: string; permissions: string[] }>> {
    const permissions = await this.permissionsCollection
      .find({
        resource_type: resourceType,
        resource_id: resourceId,
        $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
      } as any)
      .toArray();

    return permissions.map((p) => ({
      user_id: p.user_id,
      permissions: p.permissions,
    }));
  }
}
