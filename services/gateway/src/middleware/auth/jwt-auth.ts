/**
 * JWT Auth Strategy
 * Phase 4.5.z.x - Task 02: Gateway Route Restructuring
 * 
 * Delegates JWT validation to the Auth Service instead of local verification
 */

import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';

export class JwtAuthStrategy extends AuthStrategy {
  name = 'jwt';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    try {
      // Delegate token validation to the auth service via the client
      const authClient = (request.server as any).authClient;
      if (!authClient) {
        request.log.error('AuthServiceClient not available on server instance');
        return null;
      }

      const result = await authClient.validateToken(token);

      if (!result.valid || !result.payload) {
        request.log.warn({ error: result.error }, 'JWT validation failed');
        return null;
      }

      const payload = result.payload;

      return {
        tenant_id: payload.tenant_id,
        project_id: (payload as any).project_id,
        user_id: payload.user_id,
        auth_type: 'jwt',
        permissions: payload.permissions || [],
        rate_limit_tier: 'business', // Determined by tenant plan
        metadata: {
          client_id: (payload as any).client_id,
          project_id: (payload as any).project_id,
          project_stack: (payload as any).project_stack,
          project_environment: (payload as any).project_environment,
          email: payload.email,
          role: (payload as any).role,
          company_name: (payload as any).company_name,
          plan: (payload as any).plan,
          session_id: payload.session_id,
          external_id: payload.external_id,
          exp: payload.exp,
          token, // Store for context header propagation
        },
      };
    } catch (err: any) {
      request.log.error({ error: err.message }, 'JWT auth strategy error');
      return null;
    }
  }
}
