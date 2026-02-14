/**
 * Require Conversation Member Decorator
 * 
 * Decorator to enforce conversation membership checks on route handlers
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface ConversationMemberOptions {
  paramName?: string; // Name of the param containing conversation ID (default: 'id')
  minimumRole?: string; // Minimum role required (e.g., 'admin', 'member')
}

/**
 * Decorator to require conversation membership for a route
 * 
 * Usage:
 * @RequireConversationMember({ paramName: 'conversationId', minimumRole: 'member' })
 * async sendMessage(request, reply) { ... }
 */
export function RequireConversationMember(options: ConversationMemberOptions = {}) {
  const { paramName = 'id', minimumRole = 'member' } = options;

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

      const conversationId = params[paramName];

      if (!conversationId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: `Missing conversation ID parameter: ${paramName}`,
        });
      }

      // Check conversation membership
      const membership = await checkConversationMembership(
        request,
        conversationId,
        user.user_id
      );

      if (!membership.isMember) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You are not a member of this conversation',
          conversation_id: conversationId,
        });
      }

      // Check minimum role if specified
      if (minimumRole && !hasMinimumRole(membership.role, minimumRole)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Minimum role '${minimumRole}' required`,
          your_role: membership.role,
          required_role: minimumRole,
        });
      }

      // Store membership info in request for later use
      (request as any).conversationMembership = membership;

      // Membership verified, execute original method
      return originalMethod.apply(this, [request, reply]);
    };

    return descriptor;
  };
}

/**
 * Check if user is member of conversation
 */
async function checkConversationMembership(
  request: FastifyRequest,
  conversationId: string,
  userId: string
): Promise<{ isMember: boolean; role?: string }> {
  // TODO: Implement actual membership check with MongoDB and Redis caching
  // This should query the conversations collection for the user in participants array
  
  // For now, return true to avoid breaking existing functionality
  // This will be integrated with ConversationMembershipCache
  return {
    isMember: true,
    role: 'member',
  };
}

/**
 * Check if user has minimum required role
 */
function hasMinimumRole(userRole: string | undefined, minimumRole: string): boolean {
  const roleHierarchy: { [key: string]: number } = {
    owner: 3,
    admin: 2,
    member: 1,
  };

  const userLevel = roleHierarchy[userRole || 'member'] || 0;
  const requiredLevel = roleHierarchy[minimumRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Helper function to check conversation membership in route handler
 */
export async function checkMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  conversationId: string
): Promise<boolean> {
  const user = (request as any).user;

  if (!user) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return false;
  }

  const membership = await checkConversationMembership(
    request,
    conversationId,
    user.user_id
  );

  if (!membership.isMember) {
    reply.code(403).send({
      error: 'Forbidden',
      message: 'You are not a member of this conversation',
      conversation_id: conversationId,
    });
    return false;
  }

  return true;
}
