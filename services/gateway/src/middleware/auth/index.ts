import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { AuthStrategy } from './strategies';
import { ApiKeyAuthStrategy } from './api-key-auth';
import { JwtAuthStrategy } from './jwt-auth';
import { SdkAuthStrategy } from './sdk-auth';
import { UnauthorizedError } from '../../errors';
import { authDecoratorsPlugin } from './decorators';
import { ipWhitelistValidator } from './ip-whitelist-validator';
import { originValidator } from './origin-validator';

export class AuthMiddleware {
  private strategies: AuthStrategy[] = [];

  constructor() {
    this.strategies.push(new ApiKeyAuthStrategy());
    this.strategies.push(new JwtAuthStrategy());
    this.strategies.push(new SdkAuthStrategy());
  }

  async handle(request: FastifyRequest, reply: FastifyReply) {
    // If auth is already present (e.g. public route), skip
    // But actually, we usually want to attach context if possible, 
    // and enforcement is done by guards.

    for (const strategy of this.strategies) {
      const context = await strategy.authenticate(request);
      if (context) {
        request.user = {
          // IDs
          id: context.user_id || 'system',
          user_id: context.user_id || 'system',
          sub: context.user_id || 'system',
          tenantId: context.tenant_id,
          tenant_id: context.tenant_id,

          // JWT/Session specific (defaulting as they might come from API Key)
          jti: 'n/a',
          session_id: (context.metadata?.session_id as string) || 'n/a',
          iat: Math.floor(Date.now() / 1000),
          exp: (context.metadata?.exp as number) || Math.floor(Date.now() / 1000) + 3600,

          // Metadata
          email: (context.metadata?.email as string) || '',
          roles: (() => {
            const roleFromToken = context.metadata?.role as string | undefined;
            if (roleFromToken && roleFromToken.trim()) return [roleFromToken];
            if (context.auth_type === 'api_key' || context.auth_type === 'sdk') return ['tenant_admin'];
            return [];
          })(),
          scopes: context.permissions || [],
        } as any;
        // We might want to attach the full context too
        (request as any).auth = context;

        // Run additional validators based on auth type
        if (context.auth_type === 'api_key') {
          await ipWhitelistValidator(request, reply);
        } else if (context.auth_type === 'jwt') {
          await originValidator(request, reply);
        }

        return;
      }
    }

    // If no strategy succeeded, we don't necessarily throw here.
    // We throw in the route guard if auth is required.
  }
}

export const authMiddleware = new AuthMiddleware();

// Fastify plugin to register the middleware globally or per-route
export const authPlugin = fp(async (fastify) => {
  // Register auth decorators first
  await fastify.register(authDecoratorsPlugin);

  fastify.decorateRequest('auth', null);

  fastify.addHook('preHandler', async (request, reply) => {
    await authMiddleware.handle(request, reply);
  });
});
