import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { ObjectId } from 'mongodb';

type AuditQueryInput = {
  tenant_id?: string;
  action?: string;
  actor_id?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: string | number;
  limit?: string | number;
  format?: 'json' | 'csv';
};

function resolveTenantId(request: FastifyRequest, reply: FastifyReply, requestedTenantId?: string): string | null {
  const auth = (request as any).auth;
  const tenantIdFromAuth = auth?.tenant_id || request.user?.tenant_id;

  if (!tenantIdFromAuth) {
    reply.code(401).send({
      error: 'Authentication required',
      code: 'context_missing',
    });
    return null;
  }

  if (requestedTenantId && requestedTenantId !== tenantIdFromAuth) {
    reply.code(403).send({
      error: 'Provided tenant_id does not match authenticated context',
      code: 'identity_context_mismatch',
    });
    return null;
  }

  return tenantIdFromAuth;
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function describeAuditEvent(log: Record<string, any>): string {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const method = typeof metadata.method === 'string' ? metadata.method : null;
  const url = typeof metadata.url === 'string' ? metadata.url : null;
  const status = typeof metadata.status_code === 'number' ? metadata.status_code : null;

  if (method || url || status) {
    return [method, url, status ? `status ${status}` : null].filter(Boolean).join(' ');
  }

  if (typeof log.resource_id === 'string' && log.resource_id.length > 0) {
    return log.resource_id;
  }

  return 'Audit event';
}

function normalizeAction(action: unknown): string {
  if (typeof action !== 'string' || action.length === 0) {
    return 'unknown';
  }

  if (action.startsWith('POST_') || action.startsWith('GET_') || action.startsWith('PUT_') || action.startsWith('DELETE_') || action.startsWith('PATCH_')) {
    const [method, ...routeParts] = action.split('_');
    return `${method.toLowerCase()} ${routeParts.join('_')}`;
  }

  return action.replace(/[._]/g, ' ');
}

const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/query', async (request, reply) => {
    try {
      const query = (request.query || {}) as AuditQueryInput;
      const tenantId = resolveTenantId(request, reply, query.tenant_id);
      if (!tenantId) return;

      const page = Math.max(1, Number(query.page || 1));
      const limit = Math.min(200, Math.max(1, Number(query.limit || 25)));
      const skip = (page - 1) * limit;

      const filters: Record<string, unknown> = { tenant_id: tenantId };
      if (query.action) filters.action = query.action;
      if (query.actor_id) filters.user_id = query.actor_id;
      if (query.resource_type) filters.resource_type = query.resource_type;

      const startDate = toDate(query.start_date);
      const endDate = toDate(query.end_date);
      if (startDate || endDate) {
        filters.created_at = {
          ...(startDate ? { $gte: startDate } : {}),
          ...(endDate ? { $lte: endDate } : {}),
        };
      }

      const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
      const [total, logs] = await Promise.all([
        collection.countDocuments(filters),
        collection.find(filters).sort({ created_at: -1 }).skip(skip).limit(limit).toArray(),
      ]);

      const events = logs.map((log: any) => ({
        id: log.audit_id || log._id?.toString?.() || 'unknown',
        action: normalizeAction(log.action),
        actor_id: log.user_id || 'system',
        actor_type: log.user_id ? 'tenant_admin' : 'system',
        resource_type: log.resource_type || 'api_request',
        resource_id: log.resource_id || '',
        ip_address: log.metadata?.ip_address,
        timestamp: (log.created_at instanceof Date ? log.created_at : new Date(log.created_at || Date.now())).toISOString(),
        details: {
          description: describeAuditEvent(log),
          status_code: log.metadata?.status_code,
          correlation_id: log.metadata?.correlation_id || request.headers['x-correlation-id'] || null,
        },
        integrity_hash: log.hash,
      }));

      return reply.send({
        events,
        total,
        page,
        limit,
        has_more: skip + events.length < total,
        source: {
          backend: 'gateway',
          collection: 'caas_compliance.audit_logs',
          generated_at: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to query audit logs');
      return reply.code(503).send({
        error: 'Failed to query audit logs',
        code: 'audit_query_failed',
      });
    }
  });

  fastify.post('/verify', async (request, reply) => {
    try {
      const body = (request.body || {}) as { event_id?: string; tenant_id?: string };
      if (!body.event_id || typeof body.event_id !== 'string') {
        return reply.code(400).send({
          error: 'event_id is required',
          code: 'validation_error',
        });
      }

      const tenantId = resolveTenantId(request, reply, body.tenant_id);
      if (!tenantId) return;

      const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
      let event = await collection.findOne({
        tenant_id: tenantId,
        audit_id: body.event_id,
      });

      if (!event && ObjectId.isValid(body.event_id)) {
        event = await collection.findOne({
          tenant_id: tenantId,
          _id: new ObjectId(body.event_id),
        });
      }

      if (!event) {
        return reply.code(404).send({
          valid: false,
          message: 'Audit event not found',
          event_id: body.event_id,
        });
      }

      const hasHash = typeof (event as any).hash === 'string' && (event as any).hash.length > 0;
      let chainValid = true;

      const previous = await collection
        .find({ tenant_id: tenantId, created_at: { $lt: (event as any).created_at } })
        .sort({ created_at: -1 })
        .limit(1)
        .toArray();

      if (previous.length > 0) {
        const previousHash = previous[0].hash;
        chainValid = !previousHash || previousHash === (event as any).previous_hash;
      }

      const valid = hasHash && chainValid;
      return reply.send({
        valid,
        message: valid ? 'Audit event integrity check passed' : 'Audit event integrity check failed',
        event_id: body.event_id,
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to verify audit event integrity');
      return reply.code(503).send({
        valid: false,
        message: 'Integrity verification failed',
        code: 'audit_verify_failed',
      });
    }
  });

  fastify.get('/export', async (request, reply) => {
    try {
      const query = (request.query || {}) as AuditQueryInput;
      const tenantId = resolveTenantId(request, reply, query.tenant_id);
      if (!tenantId) return;

      const format = query.format || 'json';
      const limit = Math.min(5000, Math.max(1, Number(query.limit || 500)));

      const filters: Record<string, unknown> = { tenant_id: tenantId };
      if (query.action) filters.action = query.action;
      if (query.actor_id) filters.user_id = query.actor_id;
      if (query.resource_type) filters.resource_type = query.resource_type;

      const startDate = toDate(query.start_date);
      const endDate = toDate(query.end_date);
      if (startDate || endDate) {
        filters.created_at = {
          ...(startDate ? { $gte: startDate } : {}),
          ...(endDate ? { $lte: endDate } : {}),
        };
      }

      const collection = fastify.mongo.client.db('caas_compliance').collection('audit_logs');
      const logs = await collection.find(filters).sort({ created_at: -1 }).limit(limit).toArray();

      const rows = logs.map((log: any) => ({
        id: log.audit_id || log._id?.toString?.() || 'unknown',
        action: normalizeAction(log.action),
        actor_id: log.user_id || 'system',
        resource_type: log.resource_type || 'api_request',
        resource_id: log.resource_id || '',
        ip_address: log.metadata?.ip_address || '',
        status_code: log.metadata?.status_code || '',
        timestamp: (log.created_at instanceof Date ? log.created_at : new Date(log.created_at || Date.now())).toISOString(),
      }));

      if (format === 'csv') {
        const header = 'id,action,actor_id,resource_type,resource_id,ip_address,status_code,timestamp';
        const lines = rows.map((row) =>
          [
            row.id,
            row.action,
            row.actor_id,
            row.resource_type,
            row.resource_id,
            row.ip_address,
            row.status_code,
            row.timestamp,
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(',')
        );

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        return reply.send([header, ...lines].join('\n'));
      }

      return reply.send({
        events: rows,
        total: rows.length,
        format: 'json',
      });
    } catch (error: any) {
      request.log.error({ err: error }, 'Failed to export audit logs');
      return reply.code(503).send({
        error: 'Audit export failed',
        code: 'audit_export_failed',
      });
    }
  });
};

export default auditRoutes;
