import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';
import { tenantService } from '../../services/tenant-service';

export class ApiKeyAuthStrategy extends AuthStrategy {
  name = 'api_key';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      return null;
    }

    const tenant = await tenantService.getTenantByApiKey(apiKey);

    if (tenant) {
      return {
        tenant_id: tenant.tenant_id,
        auth_type: 'api_key',
        permissions: ['*'], // In real app, we'd fetch specific permissions for this key
        rate_limit_tier: tenant.plan === 'enterprise' ? 'enterprise' : 'business',
        metadata: { source: 'api_key' },
      };
    }

    return null;
  }
}
