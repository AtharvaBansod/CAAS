import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../errors';

export const crossTenantCheck = async (request: FastifyRequest, reply: FastifyReply) => {
  const tenant = request.tenant;
  if (!tenant) return; // Should be handled by tenant resolver if required

  const user = request.user;
  
  // 1. Check if resource belongs to tenant
  // This is tricky as generic middleware. Usually done in service layer or specific route guards.
  // But we can check for tenant_id in route params if it exists and matches context.
  
  const params = request.params as any;
  if (params.tenantId && params.tenantId !== tenant.tenant_id) {
    // If user is accessing /tenants/:tenantId/..., verify they are that tenant
    // (unless super admin, which we'll skip for now)
    request.log.warn({
      expected: params.tenantId,
      actual: tenant.tenant_id,
      user: user?.id || 'unknown'
    }, 'Cross-tenant access attempt detected');
    
    throw new ForbiddenError('Access to other tenant resources is forbidden');
  }
};
