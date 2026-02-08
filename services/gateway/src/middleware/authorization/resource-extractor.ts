/**
 * Resource Extractor
 * 
 * Extracts authorization resource from request
 */

import { FastifyRequest } from 'fastify';
import { AuthzResource } from './types';

export class ResourceExtractor {
  private resourceTypeMap: Map<string, string>;

  constructor() {
    // Map route patterns to resource types
    this.resourceTypeMap = new Map([
      ['/v1/messages', 'message'],
      ['/v1/conversations', 'conversation'],
      ['/v1/groups', 'group'],
      ['/v1/users', 'user'],
      ['/v1/files', 'file'],
      ['/v1/admin', 'admin'],
    ]);
  }

  /**
   * Extract resource from request
   */
  async extract(request: FastifyRequest): Promise<AuthzResource> {
    const resourceType = this.extractResourceType(request);
    const resourceId = this.extractResourceId(request);
    const tenantId = this.extractTenantId(request);

    // For specific resources, fetch additional attributes
    let attributes: Record<string, unknown> = {};
    let ownerId: string | undefined;

    if (resourceId) {
      const resourceData = await this.fetchResourceData(
        resourceType,
        resourceId,
        tenantId
      );
      attributes = resourceData.attributes;
      ownerId = resourceData.owner_id;
    }

    return {
      type: resourceType,
      id: resourceId,
      tenant_id: tenantId,
      owner_id: ownerId,
      attributes,
    };
  }

  /**
   * Extract resource type from route
   */
  private extractResourceType(request: FastifyRequest): string {
    const path = request.url.split('?')[0];

    // Check route patterns
    for (const [pattern, type] of this.resourceTypeMap.entries()) {
      if (path.startsWith(pattern)) {
        return type;
      }
    }

    // Default to generic resource
    return 'resource';
  }

  /**
   * Extract resource ID from params
   */
  private extractResourceId(request: FastifyRequest): string | undefined {
    const params = request.params as any;
    return params?.id || params?.messageId || params?.conversationId || params?.groupId;
  }

  /**
   * Extract tenant ID from request
   */
  private extractTenantId(request: FastifyRequest): string {
    const user = (request as any).user;
    return user?.tenant_id || 'unknown';
  }

  /**
   * Fetch resource data from database (cached)
   */
  private async fetchResourceData(
    resourceType: string,
    resourceId: string,
    tenantId: string
  ): Promise<{ attributes: Record<string, unknown>; owner_id?: string }> {
    // TODO: Implement actual database lookup with caching
    // For now, return minimal data
    
    // In production, this would:
    // 1. Check Redis cache first
    // 2. Query MongoDB if not cached
    // 3. Cache the result
    // 4. Return resource attributes

    return {
      attributes: {
        resource_type: resourceType,
        resource_id: resourceId,
        tenant_id: tenantId,
      },
      owner_id: undefined,
    };
  }

  /**
   * Register custom resource type mapping
   */
  registerResourceType(pattern: string, type: string): void {
    this.resourceTypeMap.set(pattern, type);
  }
}

export const resourceExtractor = new ResourceExtractor();
