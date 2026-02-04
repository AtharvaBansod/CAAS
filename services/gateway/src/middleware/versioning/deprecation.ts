import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiVersion } from '../../routes/version-manager';

interface DeprecationConfig {
  sunsetDate?: string; // ISO Date
  migrationLink?: string;
  message?: string;
}

const DEPRECATION_MAP: Partial<Record<ApiVersion, DeprecationConfig>> = {
  // Example:
  // [ApiVersion.V1]: {
  //   sunsetDate: '2025-12-31T23:59:59Z',
  //   migrationLink: 'https://docs.caas.com/migration/v1-to-v2',
  //   message: 'v1 is deprecated. Please upgrade to v2.'
  // }
};

export const deprecationMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const version = (request as any).apiVersion as ApiVersion;
  
  if (!version) return;

  const config = DEPRECATION_MAP[version];
  if (config) {
    reply.header('Deprecation', 'true');
    if (config.sunsetDate) {
      reply.header('Sunset', config.sunsetDate);
    }
    if (config.migrationLink) {
      reply.header('Link', `<${config.migrationLink}>; rel="deprecation"; type="text/html"`);
    }
    
    // Log deprecated usage
    request.log.warn({
      version,
      path: request.url,
      client: (request as any).clientIp, // Assuming clientIp is attached
    }, 'Deprecated API usage detected');
  }
};
