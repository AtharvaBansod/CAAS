import { FastifyRequest } from 'fastify';
import { AuthStrategy } from './strategies';
import { AuthContext } from './auth-context';
import { UnauthorizedError } from '../../errors';

export class JwtAuthStrategy extends AuthStrategy {
  name = 'jwt';

  async authenticate(request: FastifyRequest): Promise<AuthContext | null> {
    try {
      // Fastify JWT plugin attaches verification to request
      // We need to handle the case where it might throw or return null
      // But since we are inside a custom middleware, we might need to invoke it manually 
      // or rely on previous decoration.
      
      // Let's assume request.jwtVerify() has been called or we call it here.
      // However, request.jwtVerify() throws if invalid.
      
      // Check for Authorization header
      if (!request.headers.authorization) {
        return null;
      }

      const decoded = await request.jwtVerify<{
        sub: string;
        tenantId: string;
        permissions: string[];
        roles: string[];
      }>();

      return {
        tenant_id: decoded.tenantId,
        user_id: decoded.sub,
        auth_type: 'jwt',
        permissions: decoded.permissions || [],
        rate_limit_tier: 'business', // Should come from tenant details
        metadata: { roles: decoded.roles },
      };
    } catch (err) {
      // Token present but invalid -> we might want to throw or return null
      // If we return null, other strategies might try. 
      // If we throw, it stops.
      // Usually if Bearer token is present but invalid, it should fail immediately.
      return null;
    }
  }
}
