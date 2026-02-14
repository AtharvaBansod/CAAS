import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
  }
}

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'User not authenticated',
    });
  }

  request.tenantId = request.user.tenant_id;

  if (!request.tenantId) {
    return reply.code(400).send({
      error: 'BadRequest',
      message: 'Tenant ID not found in token',
    });
  }
}
