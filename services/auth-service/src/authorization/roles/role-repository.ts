/**
 * Role Repository
 * 
 * MongoDB storage for roles
 */

import { Collection, Db, ObjectId } from 'mongodb';
import { Role, CreateRoleDTO, UpdateRoleDTO } from './types';
import { SYSTEM_ROLES } from './system-roles';

export class RoleRepository {
  private rolesCollection: Collection<Role>;

  constructor(db: Db) {
    this.rolesCollection = db.collection('roles');
  }

  /**
   * Initialize indexes and system roles
   */
  async initialize(): Promise<void> {
    // Create indexes
    await this.rolesCollection.createIndex({ tenant_id: 1, name: 1 }, { unique: true });
    await this.rolesCollection.createIndex({ id: 1 }, { unique: true });

    // Insert system roles if not exist
    for (const role of SYSTEM_ROLES) {
      await this.rolesCollection.updateOne(
        { id: role.id },
        {
          $setOnInsert: {
            ...role,
            metadata: {
              created_at: new Date(),
              updated_at: new Date(),
              created_by: 'system',
            },
          },
        },
        { upsert: true }
      );
    }
  }

  /**
   * Create a role
   */
  async create(dto: CreateRoleDTO, createdBy: string): Promise<Role> {
    const role: Role = {
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: dto.name,
      description: dto.description,
      tenant_id: dto.tenant_id,
      is_system: false,
      permissions: dto.permissions,
      inherits: dto.inherits,
      metadata: {
        created_at: new Date(),
        updated_at: new Date(),
        created_by: createdBy,
      },
    };

    const result = await this.rolesCollection.insertOne(role as any);
    role._id = result.insertedId.toString();

    return role;
  }

  /**
   * Get role by ID
   */
  async getById(id: string): Promise<Role | null> {
    return await this.rolesCollection.findOne({ id });
  }

  /**
   * Get roles by tenant
   */
  async getByTenant(tenantId: string): Promise<Role[]> {
    return await this.rolesCollection
      .find({
        $or: [{ tenant_id: tenantId }, { tenant_id: null, is_system: true }],
      })
      .toArray();
  }

  /**
   * Get system roles
   */
  async getSystemRoles(): Promise<Role[]> {
    return await this.rolesCollection.find({ is_system: true }).toArray();
  }

  /**
   * Update role
   */
  async update(id: string, dto: UpdateRoleDTO, updatedBy: string): Promise<Role> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Role not found: ${id}`);
    }

    if (existing.is_system) {
      throw new Error('Cannot modify system roles');
    }

    const updated = {
      ...dto,
      'metadata.updated_at': new Date(),
      'metadata.updated_by': updatedBy,
    };

    await this.rolesCollection.updateOne({ id }, { $set: updated });

    return (await this.getById(id))!;
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    if (existing.is_system) {
      throw new Error('Cannot delete system roles');
    }

    const result = await this.rolesCollection.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
