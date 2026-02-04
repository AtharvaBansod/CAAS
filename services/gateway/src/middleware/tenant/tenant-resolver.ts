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
    throw new NotFoundError(`Tenant ${tenantId} not found`);
  }

  if (!tenant.is_active) {
    throw new BadRequestError('Tenant is suspended');
  }

  request.tenant = tenant;
};
