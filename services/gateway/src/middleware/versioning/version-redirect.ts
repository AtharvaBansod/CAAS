import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiVersion } from '../../routes/version-manager';

export const versionRedirectMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  // Logic to redirect old versions or handle compatibility
  // For example, if someone requests /v0/..., redirect to /v1/...
  
  const url = request.url;
  if (url.startsWith('/v0/')) {
    const newUrl = url.replace('/v0/', '/v1/');
    reply.redirect(301, newUrl);
  }
};
