/**
 * Audit Routes
 * Phase 4.5.1 - Task 03: Service Integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from '../services/audit.service';

export async function auditRoutes(fastify: FastifyInstance) {
  const auditService = new AuditService();

  // Log single audit event
  fastify.post('/api/v1/audit/log', async (request: FastifyRequest, reply: FastifyReply) => {
    const event = request.body as any;

    if (!event.tenant_id || !event.action || !event.resource_type) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const audit_id = await auditService.log(event);
      return reply.code(201).send({ audit_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to log audit event' });
    }
  });

  // Log batch audit events
  fastify.post('/api/v1/audit/batch', async (request: FastifyRequest, reply: FastifyReply) => {
    const { events } = request.body as { events: any[] };

    if (!events || !Array.isArray(events)) {
      return reply.code(400).send({ error: 'Invalid events array' });
    }

    try {
      const audit_ids = [];
      for (const event of events) {
        const audit_id = await auditService.log(event);
        audit_ids.push(audit_id);
      }
      return reply.code(201).send({ audit_ids, count: audit_ids.length });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to log audit batch' });
    }
  });

  // Query audit logs
  fastify.get('/api/v1/audit/query', async (request: FastifyRequest, reply: FastifyReply) => {
    const filters = request.query as any;

    if (!filters.tenant_id) {
      return reply.code(400).send({ error: 'Missing tenant_id' });
    }

    // Parse numeric parameters
    if (filters.limit) filters.limit = parseInt(filters.limit, 10);
    if (filters.skip) filters.skip = parseInt(filters.skip, 10);

    try {
      const logs = await auditService.query(filters);
      return reply.code(200).send({ logs, count: logs.length });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to query audit logs' });
    }
  });

  // Verify audit log integrity
  fastify.post('/api/v1/audit/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant_id, start_date, end_date } = request.body as {
      tenant_id: string;
      start_date?: Date;
      end_date?: Date;
    };

    if (!tenant_id) {
      return reply.code(400).send({ error: 'Missing tenant_id' });
    }

    try {
      const result = await auditService.verifyIntegrity(tenant_id, start_date, end_date);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to verify integrity' });
    }
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await auditService.shutdown();
  });
}
