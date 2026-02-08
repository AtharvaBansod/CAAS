/**
 * CSP Violation Report Endpoint
 * 
 * Receives and processes Content Security Policy violation reports
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';

const cspReportRoutes: FastifyPluginAsync = async (fastify) => {
  // Receive CSP violation reports
  fastify.post(
    '/csp-report',
    {
      schema: {
        tags: ['Security'],
        summary: 'Receive CSP violation report',
        description: 'Endpoint for browsers to report Content Security Policy violations',
        body: Type.Object({
          'csp-report': Type.Object({
            'document-uri': Type.String(),
            'referrer': Type.Optional(Type.String()),
            'violated-directive': Type.String(),
            'effective-directive': Type.String(),
            'original-policy': Type.String(),
            'blocked-uri': Type.String(),
            'status-code': Type.Number(),
            'source-file': Type.Optional(Type.String()),
            'line-number': Type.Optional(Type.Number()),
            'column-number': Type.Optional(Type.Number()),
          }),
        }),
        response: {
          204: Type.Null(),
        },
      },
    },
    async (request, reply) => {
      const report = request.body as any;
      
      // Extract metadata
      const metadata = {
        userAgent: request.headers['user-agent'] || 'unknown',
        ipAddress: request.ip,
        tenantId: (request as any).tenantId,
      };

      // TODO: Integrate with CSPViolationHandler
      // const handler = new CSPViolationHandler(db);
      // await handler.handleViolation(report, metadata);

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('CSP Violation Report:', report['csp-report']);
      }

      reply.code(204).send();
    }
  );

  // Get CSP violation statistics (admin only)
  fastify.get(
    '/csp-violations/stats',
    {
      schema: {
        tags: ['Security', 'Admin'],
        summary: 'Get CSP violation statistics',
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              total: Type.Number(),
              byDirective: Type.Record(Type.String(), Type.Number()),
              recent: Type.Array(Type.Any()),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      // TODO: Integrate with CSPViolationHandler
      // const handler = new CSPViolationHandler(db);
      // const stats = await handler.getStatistics(request.tenantId);

      reply.send({
        success: true,
        data: {
          total: 0,
          byDirective: {},
          recent: [],
        },
      });
    }
  );
};

export default cspReportRoutes;
