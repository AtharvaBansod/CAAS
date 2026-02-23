/**
 * Correlation ID Middleware
 * Phase 4.5.z Task 08: End-to-End Request Tracking
 * 
 * Generates or extracts correlation ID for request tracing
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware to handle correlation ID
 */
export async function correlationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract correlation ID from header or generate new one
  let correlationId = request.headers[CORRELATION_ID_HEADER] as string;
  
  if (!correlationId) {
    correlationId = randomUUID();
  }

  // Store in request context
  (request as any).correlationId = correlationId;

  // Add to response header
  reply.header(CORRELATION_ID_HEADER, correlationId);

  // Add to logger context
  request.log = request.log.child({ correlationId });
}

/**
 * Get correlation ID from request
 */
export function getCorrelationId(request: FastifyRequest): string {
  return (request as any).correlationId || randomUUID();
}
