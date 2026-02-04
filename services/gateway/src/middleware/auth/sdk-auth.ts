import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';
import { tenantService } from '../../services/tenant-service';

export class SdkAuthStrategy extends AuthStrategy {
  name = 'sdk';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    const appId = request.headers['x-app-id'] as string;
    const appSecret = request.headers['x-app-secret'] as string;

    if (!appId || !appSecret) {
      return null;
    }

    // In a real app, we would look up the app credentials in DB
    // For now, we'll verify against a hardcoded secret or mock
    // TODO: Implement actual App verification against TenantService or AppService

    if (appId === 'app-tenant-123' && appSecret === 'secret-123') {
       const tenant = await tenantService.getTenant('tenant-123');
       if (tenant) {
         return {
           tenant_id: tenant.tenant_id,
           auth_type: 'sdk',
           permissions: ['*'],
           rate_limit_tier: tenant.plan,
           metadata: { app_id: appId }
         };
       }
    }

    return null;
  }
}
