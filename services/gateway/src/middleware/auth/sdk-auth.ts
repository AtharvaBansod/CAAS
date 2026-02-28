/**
 * SDK Auth Strategy
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * SDK auth uses API key validation via the Auth Service
 * This is essentially the same as API key auth but with SDK-specific context
 */

import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';

export class SdkAuthStrategy extends AuthStrategy {
  name = 'sdk';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    const appId = request.headers['x-app-id'] as string;
    const appSecret = request.headers['x-app-secret'] as string;
    const projectId = request.headers['x-project-id'] as string | undefined;

    if (!appId || !appSecret) {
      return null;
    }

    try {
      // Delegate to auth service for SDK app validation
      const authClient = (request.server as any).authClient;
      if (!authClient) {
        request.log.error('AuthServiceClient not available on server instance');
        return null;
      }

      // Use API key validation for SDK apps
      const result = await authClient.validateApiKey(appSecret, request.ip);

      if (!result.valid || !result.client) {
        request.log.warn({ error: result.error }, 'SDK auth validation failed');
        return null;
      }

      return {
        tenant_id: result.client.tenant_id,
        project_id: projectId,
        auth_type: 'sdk',
        permissions: result.client.permissions || ['*'],
        rate_limit_tier: result.client.rate_limit_tier || 'business',
        metadata: {
          app_id: appId,
          client_id: result.client.client_id,
          project_id: projectId,
          plan: result.client.plan,
        },
      };
    } catch (err: any) {
      request.log.error({ error: err.message }, 'SDK auth strategy error');
      return null;
    }
  }
}
