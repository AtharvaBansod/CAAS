/**
 * Require Permission Decorator
 * 
 * Decorator to enforce permission checks on route handlers
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { hasPermission } from '../middleware/authorization/permission-matrix';

export interface PermissionOptions {
  resource: string;
  action: string;
}

/**
 * Decorator to require specific permission for a route
 * 
 * Usage:
 * @RequirePermission({ resource: 'conversation', action: 'create' })
 * async createConversation(request, reply) { ... }
 */
export function RequirePermission(options: PermissionOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      const user = (request as any).user;

      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check if user has required permission
      const permission = hasPermission(
        user.roles || [],
        options.resource,
        options.action
      );

      if (!permission) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Permission denied: ${options.action} on ${options.resource}`,
          required_permission: {
            resource: options.resource,
            action: options.action,
          },
        });
      }

      // Permission granted, execute original method
      return originalMethod.apply(this, [request, reply]);
    };

    return descriptor;
  };
}

/**
 * Helper function to check permission in route handler
 */
export async function checkPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  resource: string,
  action: string
): Promise<boolean> {
  const user = (request as any).user;

  if (!user) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return false;
  }

  const permission = hasPermission(user.roles || [], resource, action);

  if (!permission) {
    reply.code(403).send({
      error: 'Forbidden',
      message: `Permission denied: ${action} on ${resource}`,
      required_permission: {
        resource,
        action,
      },
    });
    return false;
  }

  return true;
}
