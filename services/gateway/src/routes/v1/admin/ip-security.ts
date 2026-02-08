/**
 * IP Security Admin Routes
 * 
 * Admin endpoints for managing IP whitelist, blacklist, and geo-blocking
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const ipSecurityRoutes: FastifyPluginAsync = async (fastify) => {
  // List IP whitelist
  fastify.get(
    '/whitelist',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'List IP whitelist entries',
        querystring: Type.Object({
          tenant_id: Type.Optional(Type.String()),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(Type.Any()),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with IPWhitelist
      reply.send({
        success: true,
        data: [],
      });
    }
  );

  // Add IP to whitelist
  fastify.post(
    '/whitelist',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Add IP to whitelist',
        body: Type.Object({
          ip_address: Type.String(),
          description: Type.Optional(Type.String()),
          expires_at: Type.Optional(Type.String()),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ip_address, description, expires_at } = request.body as any;
      
      // TODO: Validate IP address/CIDR
      // TODO: Add to whitelist
      
      reply.code(201).send({
        success: true,
        message: 'IP added to whitelist',
      });
    }
  );

  // Remove IP from whitelist
  fastify.delete(
    '/whitelist/:ip',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Remove IP from whitelist',
        params: Type.Object({
          ip: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ip } = request.params as { ip: string };
      
      // TODO: Remove from whitelist
      
      reply.send({
        success: true,
        message: 'IP removed from whitelist',
      });
    }
  );

  // List IP blacklist
  fastify.get(
    '/blacklist',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'List IP blacklist entries',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(Type.Any()),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with IPBlacklist
      reply.send({
        success: true,
        data: [],
      });
    }
  );

  // Add IP to blacklist
  fastify.post(
    '/blacklist',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Add IP to blacklist',
        body: Type.Object({
          ip_address: Type.String(),
          reason: Type.Union([
            Type.Literal('manual'),
            Type.Literal('rate_limit'),
            Type.Literal('brute_force'),
            Type.Literal('security_event'),
            Type.Literal('threat_intel'),
          ]),
          description: Type.Optional(Type.String()),
          is_permanent: Type.Boolean(),
          duration_minutes: Type.Optional(Type.Number()),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ip_address, reason, description, is_permanent, duration_minutes } = request.body as any;
      
      // TODO: Add to blacklist
      
      reply.code(201).send({
        success: true,
        message: 'IP added to blacklist',
      });
    }
  );

  // Remove IP from blacklist
  fastify.delete(
    '/blacklist/:ip',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Remove IP from blacklist',
        params: Type.Object({
          ip: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ip } = request.params as { ip: string };
      
      // TODO: Remove from blacklist
      
      reply.send({
        success: true,
        message: 'IP removed from blacklist',
      });
    }
  );

  // Get geo-blocking rules
  fastify.get(
    '/geo-rules',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Get geo-blocking rules',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(Type.Any()),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with GeoBlockingManager
      reply.send({
        success: true,
        data: [],
      });
    }
  );

  // Update geo-blocking rules
  fastify.put(
    '/geo-rules',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Update geo-blocking rules',
        body: Type.Object({
          rule_type: Type.Union([Type.Literal('allow'), Type.Literal('deny')]),
          countries: Type.Array(Type.String()),
          description: Type.Optional(Type.String()),
          is_active: Type.Boolean(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { rule_type, countries, description, is_active } = request.body as any;
      
      // TODO: Update geo-blocking rules
      
      reply.send({
        success: true,
        message: 'Geo-blocking rules updated',
      });
    }
  );

  // Get IP security statistics
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Admin', 'Security'],
        summary: 'Get IP security statistics',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              whitelist_count: Type.Number(),
              blacklist_count: Type.Number(),
              geo_rules_count: Type.Number(),
              blocked_requests_today: Type.Number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Get statistics
      reply.send({
        success: true,
        data: {
          whitelist_count: 0,
          blacklist_count: 0,
          geo_rules_count: 0,
          blocked_requests_today: 0,
        },
      });
    }
  );
};

export default ipSecurityRoutes;
