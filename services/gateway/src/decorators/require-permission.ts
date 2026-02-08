/**
 * Require Permission Decorator
 * 
 * Route decorator for explicit permission requirements
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { authzEnforcer } from '../middleware/authorization/authz-enforcer';
import { subjectExtractor } from '../middleware/authorization/subject-extractor';
import { resourceExtractor } from '../middleware/authorization/resource-extractor';

/**
 * Require permission decorator options
 */
export interface RequirePermissionOptions {
  permission: string | string[];
  resourceType?: string;
  skipResourceFetch?: boolean;
}

/**
 * Create a permission check handler
 */
export function requirePermission(
  permission: string | string[],
  options: Omit<RequirePermissionOptions, 'permission'> = {}
) {
  const permissions = Array.isArray(permission) ? permission : [permission];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract subject
      const subject = subjectExtractor.extract(request);

      // Extract or create resource
      let resource;
      if (options.skipResourceFetch) {
        resource = {
          type: options.resourceType || 'resource',
          tenant_id: subject.tenant_id,
          attributes: {},
        };
      } else {
        resource = await resourceExtractor.extract(request);
      }

      // Check each permission (OR logic - any permission grants access)
      const decisions = await Promise.all(
        permissions.map((perm) =>
          authzEnforcer.authorize({
            subject,
            resource,
            action: perm,
            environment: {
              ip_address: request.ip,
              time: new Date(),
              user_agent: request.headers['user-agent'],
            },
          })
        )
      );

      const allowed = decisions.some((d) => d.allowed);

      if (!allowed) {
        const reasons = decisions.map((d) => d.reason).filter(Boolean);
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Insufficient permissions',
          required_permissions: permissions,
          reasons,
        });
        return;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Permission check failed',
      });
      return;
    }
  };
}

/**
 * Require all permissions (AND logic)
 */
export function requireAllPermissions(
  permissions: string[],
  options: Omit<RequirePermissionOptions, 'permission'> = {}
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subject = subjectExtractor.extract(request);

      let resource;
      if (options.skipResourceFetch) {
        resource = {
          type: options.resourceType || 'resource',
          tenant_id: subject.tenant_id,
          attributes: {},
        };
      } else {
        resource = await resourceExtractor.extract(request);
      }

      // Check all permissions (AND logic)
      const decisions = await Promise.all(
        permissions.map((perm) =>
          authzEnforcer.authorize({
            subject,
            resource,
            action: perm,
            environment: {
              ip_address: request.ip,
              time: new Date(),
              user_agent: request.headers['user-agent'],
            },
          })
        )
      );

      const allAllowed = decisions.every((d) => d.allowed);

      if (!allAllowed) {
        const deniedPermissions = permissions.filter((_, i) => !decisions[i].allowed);
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Missing required permissions',
          required_permissions: permissions,
          denied_permissions: deniedPermissions,
        });
        return;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Permission check failed',
      });
      return;
    }
  };
}

/**
 * Require role decorator
 */
export function requireRole(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subject = subjectExtractor.extract(request);

      const hasRole = roles.some((r) => subject.roles.includes(r));

      if (!hasRole) {
        reply.code(403).send({
          error: 'Forbidden',
          message: 'Insufficient role',
          required_roles: roles,
          user_roles: subject.roles,
        });
        return;
      }
    } catch (error) {
      console.error('Role check error:', error);
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Role check failed',
      });
      return;
    }
  };
}
