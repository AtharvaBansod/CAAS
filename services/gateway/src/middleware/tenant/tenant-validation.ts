import { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../errors';

export const validateTenantStatus = async (request: FastifyRequest, reply: FastifyReply) => {
  const tenant = request.tenant;
  if (!tenant) return;

  if (!tenant.is_active) {
    throw new ForbiddenError('Tenant account is suspended or inactive');
  }

  // Check limits if needed (e.g. storage, user count)
  // This is usually done before specific actions (create user, upload file)
  // But we could check global API rate limits here if not handled by rate-limiter
};
