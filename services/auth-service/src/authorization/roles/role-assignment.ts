/**
 * Role Assignment
 * 
 * Manages user-role assignments
 */

import { Collection, Db } from 'mongodb';
import { RoleAssignment } from './types';

export class RoleAssignmentService {
  private assignmentsCollection: Collection<RoleAssignment>;

  constructor(db: Db) {
    this.assignmentsCollection = db.collection('user_roles');
  }

  /**
   * Initialize indexes
   */
  async initialize(): Promise<void> {
    await this.assignmentsCollection.createIndex({ user_id: 1, role_id: 1 });
    await this.assignmentsCollection.createIndex({ user_id: 1, tenant_id: 1 });
    await this.assignmentsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Assign role to user
   */
  async assign(assignment: Omit<RoleAssignment, '_id'>): Promise<RoleAssignment> {
    const result = await this.assignmentsCollection.insertOne(assignment as any);
    return { ...assignment, _id: result.insertedId.toString() };
  }

  /**
   * Revoke role from user
   */
  async revoke(userId: string, roleId: string, tenantId: string): Promise<boolean> {
    const result = await this.assignmentsCollection.deleteOne({
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
    });
    return result.deletedCount > 0;
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string, tenantId: string): Promise<RoleAssignment[]> {
    return await this.assignmentsCollection
      .find({
        user_id: userId,
        tenant_id: tenantId,
        $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
      })
      .toArray();
  }

  /**
   * Get users with role
   */
  async getUsersWithRole(roleId: string, tenantId: string): Promise<RoleAssignment[]> {
    return await this.assignmentsCollection
      .find({
        role_id: roleId,
        tenant_id: tenantId,
      })
      .toArray();
  }

  /**
   * Check if user has role
   */
  async hasRole(userId: string, roleId: string, tenantId: string): Promise<boolean> {
    const count = await this.assignmentsCollection.countDocuments({
      user_id: userId,
      role_id: roleId,
      tenant_id: tenantId,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    });
    return count > 0;
  }
}
