/**
 * Privacy API Routes
 * 
 * GDPR data subject rights endpoints
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  // Request data export
  fastify.post(
    '/export',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Request data export',
        body: Type.Object({
          format: Type.Optional(Type.Union([Type.Literal('json'), Type.Literal('csv')])),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              request_id: Type.String(),
              status: Type.String(),
              expires_at: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { format = 'json' } = request.body as { format?: 'json' | 'csv' };
      const userId = request.user?.user_id;
      const tenantId = request.user?.tenant_id;

      // TODO: Integrate with DataExportService
      reply.code(201).send({
        success: true,
        data: {
          request_id: 'export_123',
          status: 'pending',
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
  );

  // Get export status
  fastify.get(
    '/export/:id',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Get export request status',
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              request_id: Type.String(),
              status: Type.String(),
              download_url: Type.Optional(Type.String()),
              expires_at: Type.Optional(Type.String()),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      // TODO: Integrate with DataExportService
      reply.send({
        success: true,
        data: {
          request_id: id,
          status: 'completed',
          download_url: '/downloads/export_123.json',
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
  );

  // Request data erasure
  fastify.post(
    '/erase',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Request data erasure',
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              request_id: Type.String(),
              status: Type.String(),
              message: Type.String(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.user_id;
      const tenantId = request.user?.tenant_id;

      // TODO: Integrate with DataErasureService
      reply.code(201).send({
        success: true,
        data: {
          request_id: 'erasure_123',
          status: 'pending',
          message: 'Verification email sent. Please verify to proceed.',
        },
      });
    }
  );

  // Verify erasure request
  fastify.post(
    '/erase/:id/verify',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Verify erasure request',
        params: Type.Object({
          id: Type.String(),
        }),
        body: Type.Object({
          verification_code: Type.String(),
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
      const { id } = request.params as { id: string };
      const { verification_code } = request.body as { verification_code: string };

      // TODO: Integrate with DataErasureService
      reply.send({
        success: true,
        message: 'Erasure request verified and queued for processing.',
      });
    }
  );

  // Get consent status
  fastify.get(
    '/consent',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Get consent status',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                consent_type: Type.String(),
                granted: Type.Boolean(),
                granted_at: Type.Optional(Type.String()),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user?.user_id;
      const tenantId = request.user?.tenant_id;

      // TODO: Integrate with ConsentManager
      reply.send({
        success: true,
        data: [
          {
            consent_type: 'data_processing',
            granted: true,
            granted_at: new Date().toISOString(),
          },
          {
            consent_type: 'marketing',
            granted: false,
          },
        ],
      });
    }
  );

  // Update consent
  fastify.put(
    '/consent',
    {
      schema: {
        tags: ['Privacy', 'GDPR'],
        summary: 'Update consent',
        body: Type.Object({
          consent_type: Type.Union([
            Type.Literal('data_processing'),
            Type.Literal('marketing'),
            Type.Literal('analytics'),
            Type.Literal('third_party'),
          ]),
          granted: Type.Boolean(),
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
      const { consent_type, granted } = request.body as {
        consent_type: string;
        granted: boolean;
      };
      const userId = request.user?.user_id;
      const tenantId = request.user?.tenant_id;

      // TODO: Integrate with ConsentManager
      reply.send({
        success: true,
        message: `Consent ${granted ? 'granted' : 'revoked'} for ${consent_type}`,
      });
    }
  );
};

export default privacyRoutes;
