import { FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { AuthStrategy } from './strategies';
import { ApiKeyAuthStrategy } from './api-key-auth';
import { JwtAuthStrategy } from './jwt-auth';
import { SdkAuthStrategy } from './sdk-auth';
import { UnauthorizedError } from '../../errors';

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
          id: context.user_id || 'system',
          email: '', // TODO: Fetch if needed
          roles: [], // TODO: Map permissions/roles
          tenantId: context.tenant_id,
        };
        // We might want to attach the full context too
        (request as any).auth = context;
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
  fastify.decorateRequest('auth', null);
  
  fastify.addHook('preHandler', async (request, reply) => {
    await authMiddleware.handle(request, reply);
  });
});
