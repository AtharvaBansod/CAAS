/**
 * Correlation ID Middleware for Crypto Service
 * Phase 4.5.z Task 08: End-to-End Request Tracking
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export async function correlationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  let correlationId = request.headers[CORRELATION_ID_HEADER] as string;
  
  if (!correlationId) {
    correlationId = randomUUID();
  }

  (request as any).correlationId = correlationId;
  reply.header(CORRELATION_ID_HEADER, correlationId);
}

export function getCorrelationId(request: FastifyRequest): string {
  return (request as any).correlationId || randomUUID();
}
