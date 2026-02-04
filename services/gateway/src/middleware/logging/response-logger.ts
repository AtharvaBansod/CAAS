import { FastifyRequest, FastifyReply, DoneFuncWithErrOrRes } from 'fastify';

export const responseLogger = (request: FastifyRequest, reply: FastifyReply, done: DoneFuncWithErrOrRes) => {
  const responseTime = reply.getResponseTime();
  
  const user = request.user;
  const tenant = request.tenant;
  
  request.log.info({
    statusCode: reply.statusCode,
    responseTime,
    correlationId: String(request.id),
    // Add context if available
    tenantId: tenant?.tenant_id,
    userId: user?.id,
  }, 'Request completed');
  
  done();
};
