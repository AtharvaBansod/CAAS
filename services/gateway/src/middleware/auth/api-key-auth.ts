/**
 * API Key Auth Strategy
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Delegates API key validation to the Auth Service
 * Includes IP whitelist checking via the auth service
 */

import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';

export class ApiKeyAuthStrategy extends AuthStrategy {
  name = 'api_key';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      return null;
    }

    try {
      // Delegate API key validation to the auth service
      const authClient = (request.server as any).authClient;
      if (!authClient) {
        request.log.error('AuthServiceClient not available on server instance');
        return null;
      }

      const clientIp = request.ip;
      const result = await authClient.validateApiKey(apiKey, clientIp);
      const projectId = request.headers['x-project-id'] as string | undefined;

      if (!result.valid || !result.client) {
        request.log.warn({ error: result.error }, 'API key validation failed');
        return null;
      }

      return {
        tenant_id: result.client.tenant_id,
        project_id: projectId || result.client.active_project_id,
        auth_type: 'api_key',
        permissions: result.client.permissions || ['*'],
        rate_limit_tier: result.client.rate_limit_tier || 'business',
        metadata: {
          client_id: result.client.client_id,
          project_id: projectId || result.client.active_project_id,
          active_project_id: result.client.active_project_id,
          project_ids: result.client.project_ids || [],
          plan: result.client.plan,
          source: 'api_key',
          api_key: apiKey, // Store for proxying to downstream
        },
      };
    } catch (err: any) {
      request.log.error({ error: err.message }, 'API key auth strategy error');
      return null;
    }
  }
}
