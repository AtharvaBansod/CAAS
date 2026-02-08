/**
 * Audit Middleware
 * Captures request context and emits audit events
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuditContext {
  user_id?: string;
  tenant_id?: string;
  ip_address: string;
  user_agent: string;
  session_id?: string;
  request_id: string;
  method: string;
  path: string;
  start_time: number;
}

export async function auditMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();

  // Capture context
  const context: AuditContext = {
    user_id: (request as any).user?.id,
    tenant_id: (request as any).tenant?.id,
    ip_address: request.ip,
    user_agent: request.headers['user-agent'] || '',
    session_id: (request as any).session?.id,
    request_id: request.id,
    method: request.method,
    path: request.url,
    start_time: startTime,
  };

  // Store context in request
  (request as any).auditContext = context;

  // Hook into response to log completion
  reply.addHook('onSend', async (request, reply, payload) => {
    const duration = Date.now() - startTime;

    // Log audit event for sensitive operations
    if (shouldAudit(request.method, request.url)) {
      await logAuditEvent(context, reply.statusCode, duration);
    }

    return payload;
  });
}

function shouldAudit(method: string, path: string): boolean {
  // Audit all non-GET requests
  if (method !== 'GET') {
    return true;
  }

  // Audit sensitive GET endpoints
  const sensitivePatterns = [
    '/admin/',
    '/privacy/',
    '/audit-logs',
    '/export',
  ];

  return sensitivePatterns.some(pattern => path.includes(pattern));
}

async function logAuditEvent(
  context: AuditContext,
  statusCode: number,
  duration: number
): Promise<void> {
  // TODO: Integrate with audit service
  console.log('Audit event:', {
    ...context,
    status_code: statusCode,
    duration_ms: duration,
  });
}
