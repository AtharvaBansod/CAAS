/**
 * Tenant Permissions Configuration API Routes
 * 
 * Endpoints for tenant permission settings
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const tenantPermissionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get tenant permission configuration
  fastify.get(
    '/config',
    {
      schema: {
        tags: ['Tenant', 'Permissions'],
        summary: 'Get tenant permission configuration',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Any(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = (request as any).user?.tenant_id;

      // TODO: Integrate with TenantPermissionConfig
      reply.send({
        success: true,
        data: {
          default_role: 'tenant_member',
          default_roles: ['tenant_member'],
          auto_permissions: [],
          restriction_rules: [],
        },
      });
    }
  );

  // Update tenant permission configuration
  fastify.put(
    '/config',
    {
      schema: {
        tags: ['Tenant', 'Permissions'],
        summary: 'Update tenant permission configuration',
        body: Type.Object({
          default_role: Type.Optional(Type.String()),
          default_roles: Type.Optional(Type.Array(Type.String())),
          auto_permissions: Type.Optional(Type.Array(Type.Any())),
          restriction_rules: Type.Optional(Type.Array(Type.Any())),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with TenantPermissionConfig
      reply.send({
        success: true,
      });
    }
  );
};

export default tenantPermissionsRoutes;
