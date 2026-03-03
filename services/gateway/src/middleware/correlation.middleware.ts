/**
 * Correlation ID Middleware
 * Phase 5 - Observability
 * 
 * Generates or extracts correlation ID for request tracing
 * Integrates with OpenTelemetry for distributed tracing
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { 
  extractCorrelationFromHeaders, 
  setCorrelationContext,
  getCorrelationAttributes 
} from '@caas/telemetry';
import * as api from '@opentelemetry/api';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware to handle correlation ID and context
 */
export async function correlationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract correlation context from headers
  const correlationContext = extractCorrelationFromHeaders(request.headers as Record<string, string | string[] | undefined>);
  
  // Set correlation context for async operations
  setCorrelationContext(correlationContext as any);

  // Store in request context for easy access
  (request as any).correlationId = correlationContext.correlationId;
  (request as any).correlationContext = correlationContext;

  // Add correlation ID to response header
  reply.header(CORRELATION_ID_HEADER, correlationContext.correlationId!);

  // Add to logger context
  request.log = request.log.child({ 
    correlationId: correlationContext.correlationId,
    tenantId: correlationContext.tenantId,
    clientId: correlationContext.clientId,
    userId: correlationContext.userId,
  });

  // Add correlation attributes to active span
  const span = api.trace.getActiveSpan();
  if (span) {
    const attributes = getCorrelationAttributes();
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(request: FastifyRequest): string {
  return (request as any).correlationId || randomUUID();
}

/**
 * Get full correlation context from request
 */
export function getCorrelationContext(request: FastifyRequest): any {
  return (request as any).correlationContext || {};
}
