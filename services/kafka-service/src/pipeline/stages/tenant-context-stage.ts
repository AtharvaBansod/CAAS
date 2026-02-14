/**
 * Tenant Context Stage
 * 
 * Extracts and validates tenant context from messages
 */

import { PipelineStage, PipelineContext } from '../types';
export { PipelineStage, PipelineContext };

export interface TenantInfo {
  tenant_id: string;
  tenant_name: string;
  is_active: boolean;
  settings?: Record<string, any>;
}

export class TenantContextStage implements PipelineStage {
  name = 'tenant-context';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const startTime = Date.now();

    try {
      // Extract tenant_id from message
      const tenantId = context.message.tenant_id;

      if (!tenantId) {
        throw new Error('Missing tenant_id in message');
      }

      // Load tenant configuration from MongoDB
      // TODO: Integrate with mongodb-service to fetch tenant info
      const tenantInfo = await this.loadTenantInfo(tenantId);

      // Validate tenant is active
      if (!tenantInfo.is_active) {
        throw new Error(`Tenant ${tenantId} is not active`);
      }

      // Add tenant context to pipeline
      context.tenant = tenantInfo;

      // Record metrics
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: true,
      };

      return context;
    } catch (error) {
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      throw error;
    }
  }

  /**
   * Load tenant information from database
   */
  private async loadTenantInfo(tenantId: string): Promise<TenantInfo> {
    // TODO: Implement actual MongoDB query
    // For now, return mock data
    return {
      tenant_id: tenantId,
      tenant_name: `Tenant ${tenantId}`,
      is_active: true,
      settings: {},
    };
  }
}
