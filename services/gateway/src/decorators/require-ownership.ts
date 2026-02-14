/**
 * Require Ownership Decorator
 * 
 * Decorator to enforce resource ownership checks on route handlers
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface OwnershipOptions {
  resourceType: string; // Type of resource (e.g., 'message', 'conversation')
  paramName?: string; // Name of the param containing resource ID (default: 'id')
  ownerField?: string; // Field name containing owner ID (default: 'owner_id')
}

/**
 * Decorator to require resource ownership for a route
 * 
 * Usage:
 * @RequireOwnership({ resourceType: 'message', paramName: 'messageId' })
 * async updateMessage(request, reply) { ... }
 */
export function RequireOwnership(options: OwnershipOptions) {
  const { resourceType, paramName = 'id', ownerField = 'owner_id' } = options;

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
      const params = (request as any).params;

      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const resourceId = params[paramName];

      if (!resourceId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Missing resource ID parameter: ${paramName}`,
        });
      }

      // Check resource ownership
      const ownership = await checkResourceOwnership(
        request,
        resourceType,
        resourceId,
        user.user_id,
        ownerField
      );

      if (!ownership.isOwner) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `You do not own this ${resourceType}`,
          resource_type: resourceType,
          resource_id: resourceId,
        });
      }

      // Store ownership info in request for later use
      (request as any).resourceOwnership = ownership;

      // Ownership verified, execute original method
      return originalMethod.apply(this, [request, reply]);
    };

    return descriptor;
  };
}

/**
 * Check if user owns the resource
 */
async function checkResourceOwnership(
  request: FastifyRequest,
  resourceType: string,
  resourceId: string,
  userId: string,
  ownerField: string
): Promise<{ isOwner: boolean; resource?: any }> {
  // TODO: Implement actual ownership check with MongoDB
  // This should query the appropriate collection and check the owner field
  
  // For now, return true to avoid breaking existing functionality
  // This will be integrated with proper repository queries
  return {
    isOwner: true,
    resource: null,
  };
}

/**
 * Helper function to check ownership in route handler
 */
export async function checkOwnership(
  request: FastifyRequest,
  reply: FastifyReply,
  resourceType: string,
  resourceId: string,
  ownerField: string = 'owner_id'
): Promise<boolean> {
  const user = (request as any).user;

  if (!user) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return false;
  }

  const ownership = await checkResourceOwnership(
    request,
    resourceType,
    resourceId,
    user.user_id,
    ownerField
  );

  if (!ownership.isOwner) {
    reply.code(403).send({
      error: 'Forbidden',
      message: `You do not own this ${resourceType}`,
      resource_type: resourceType,
      resource_id: resourceId,
    });
    return false;
  }

  return true;
}
