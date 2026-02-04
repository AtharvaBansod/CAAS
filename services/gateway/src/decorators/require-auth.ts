import { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../errors';

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!(request as any).auth) {
    throw new UnauthorizedError('Authentication required');
  }
};

export const requirePermission = (permission: string) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    
    const auth = (request as any).auth;
    if (!auth.permissions.includes(permission) && !auth.permissions.includes('*')) {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  };
};
