/**
 * Authorization Middleware
 * 
 * Fastify middleware for enforcing authorization policies
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { subjectExtractor } from './subject-extractor';
import { resourceExtractor } from './resource-extractor';
import { actionMapper } from './action-mapper';
import { authzEnforcer } from './authz-enforcer';
import { AuthzOptions, AuthzRequest } from './types';

/**
 * Create authorization middleware
 */
export function createAuthzMiddleware(options: AuthzOptions = {}) {
  const {
    enabled = true,
    skipRoutes = ['/health', '/docs', '/v1/auth/login', '/v1/auth/register'],
    auditEnabled = true,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip if disabled
    if (!enabled) {
      return;
    }

    // Skip public routes
    const path = request.url.split('?')[0];
    if (skipRoutes.some((route) => path.startsWith(route))) {
      return;
    }

    // Skip if no user (should be caught by auth middleware)
    if (!(request as any).user) {
      return;
    }

    try {
      // Extract authorization context
      const subject = subjectExtractor.extract(request);
      const resource = await resourceExtractor.extract(request);
      const action = actionMapper.map(request);

      const authzRequest: AuthzRequest = {
        subject,
        resource,
        action,
        environment: {
          ip_address: request.ip,
          time: new Date(),
          device_type: extractDeviceType(request),
          user_agent: request.headers['user-agent'],
        },
      };

      // Store in request for later use
      (request as any).authz = {
        subject,
        resource,
        action,
      };

      // Enforce authorization
      const decision = await authzEnforcer.authorize(authzRequest);

      if (!decision.allowed) {
        reply.code(403).send({
          error: 'Forbidden',
          message: decision.reason || 'You do not have permission to perform this action',
          required_permission: action,
          resource_type: resource.type,
        });
        return;
      }
    } catch (error) {
      console.error('Authorization middleware error:', error);
      
      // Fail closed: deny on error
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Authorization check failed',
      });
      return;
    }
  };
}

/**
 * Extract device type from user agent
 */
function extractDeviceType(request: FastifyRequest): string {
  const userAgent = request.headers['user-agent'] || '';
  
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

/**
 * Default authorization middleware instance
 */
export const authzMiddleware = createAuthzMiddleware();
