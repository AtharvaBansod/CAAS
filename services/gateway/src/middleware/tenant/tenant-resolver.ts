import { FastifyRequest, FastifyReply } from 'fastify';
import { tenantService } from '../../services/tenant-service';
import { BadRequestError, NotFoundError } from '../../errors';

export const resolveTenant = async (request: FastifyRequest, reply: FastifyReply) => {
  let tenantId: string | undefined;

  // 1. Subdomain (e.g., tenant1.api.caas.com)
  const host = request.headers.host;
  if (host) {
    const parts = host.split('.');
    if (parts.length > 3) { // rudimentary check
      // tenantId = parts[0]; 
      // Disabled for local dev/simplicity unless configured
    }
  }

  // 2. Header
  const headerTenantId = request.headers['x-tenant-id'];
  if (headerTenantId && typeof headerTenantId === 'string') {
    tenantId = headerTenantId;
  }

  // 3. Auth (JWT/API Key) - pre-resolved by AuthMiddleware
  // If AuthMiddleware ran before this, it might have found tenant info.
  const authContext = (request as any).auth;
  if (authContext && authContext.tenant_id) {
    if (tenantId && tenantId !== authContext.tenant_id) {
      // Conflict between header and auth token
      throw new BadRequestError('Tenant ID mismatch between header and auth token');
    }
    tenantId = authContext.tenant_id;
  }

  if (!tenantId) {
    // If public endpoint, maybe we don't need tenant?
    // Or we require it. For now, let's assume it's optional for some, required for others.
    // We'll return and let the route handler/guard decide.
    return;
  }

  const tenant = await tenantService.getTenant(tenantId);
  if (!tenant) {
    // Backward compatibility path:
    // If tenant ID is from a validated auth context but tenant registry/cache
    // has no record yet, continue with a synthetic tenant context so admin
    // client flows (e.g. dashboard) don't hard-fail.
    if (authContext && authContext.tenant_id === tenantId) {
      const metadata = (authContext.metadata || {}) as Record<string, any>;
      const fallbackName = typeof metadata.company_name === 'string' && metadata.company_name.trim()
        ? metadata.company_name
        : `Tenant ${tenantId}`;
      const allowedPlans = new Set(['free', 'startup', 'business', 'enterprise']);
      const candidatePlan = typeof metadata.plan === 'string' ? metadata.plan : '';
      const fallbackPlan = allowedPlans.has(candidatePlan) ? candidatePlan as 'free' | 'startup' | 'business' | 'enterprise' : 'business';
      request.log.warn({ tenantId }, 'Tenant not found in tenant service; using auth-derived fallback context');
      request.tenant = {
        tenant_id: tenantId,
        id: tenantId,
        app_id: tenantId,
        name: fallbackName,
        plan: fallbackPlan,
        settings: {},
        limits: {
          api_rate_limit: 1000,
          max_users: 100,
          storage_limit_gb: 10,
        },
        database_strategy: 'shared',
        is_active: true,
        created_at: new Date(),
      };
      return;
    }
    throw new NotFoundError(`Tenant ${tenantId} not found`);
  }

  if (!tenant.is_active) {
    throw new BadRequestError('Tenant is suspended');
  }

  request.tenant = tenant;
};
