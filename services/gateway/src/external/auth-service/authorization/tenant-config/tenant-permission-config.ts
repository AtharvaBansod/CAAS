/**
 * Tenant Permission Configuration
 * 
 * Manages tenant-specific permission settings
 */

import { Collection, Db } from 'mongodb';
import { PermissionConfig } from './types';

export class TenantPermissionConfig {
  private configCollection: Collection<PermissionConfig>;

  constructor(db: Db) {
    this.configCollection = db.collection('tenant_permission_configs');
  }

  /**
   * Initialize indexes
   */
  async initialize(): Promise<void> {
    await this.configCollection.createIndex({ tenant_id: 1 }, { unique: true });
  }

  /**
   * Get configuration for tenant
   */
  async getConfig(tenantId: string): Promise<PermissionConfig> {
    const config = await this.configCollection.findOne({ tenant_id: tenantId });

    if (!config) {
      // Return default configuration
      return this.getDefaultConfig(tenantId);
    }

    return config;
  }

  /**
   * Update configuration
   */
  async updateConfig(
    tenantId: string,
    updates: Partial<PermissionConfig>
  ): Promise<void> {
    await this.configCollection.updateOne(
      { tenant_id: tenantId },
      { $set: { ...updates, updated_at: new Date() } },
      { upsert: true }
    );
  }

  /**
   * Get default roles for tenant
   */
  async getDefaultRoles(tenantId: string): Promise<string[]> {
    const config = await this.getConfig(tenantId);
    return config.default_roles || ['tenant_member'];
  }

  /**
   * Set default roles
   */
  async setDefaultRoles(tenantId: string, roles: string[]): Promise<void> {
    await this.updateConfig(tenantId, { default_roles: roles });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(tenantId: string): PermissionConfig {
    return {
      tenant_id: tenantId,
      default_role: 'tenant_member',
      default_roles: ['tenant_member'],
      auto_permissions: [],
      restriction_rules: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
  }
}
