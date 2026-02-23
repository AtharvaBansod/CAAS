/**
 * Compliance Middleware
 * Phase 4.5.z - Task 01: Gateway Compliance Integration
 * 
 * Logs all gateway requests to compliance service for audit trail
 * Now using @caas/compliance-client package for consistency
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createComplianceClient, ComplianceClient } from '@caas/compliance-client';

let complianceClient: ComplianceClient | null = null;

export function initializeComplianceClient(baseURL: string) {
  complianceClient = createComplianceClient({
    baseURL,
    timeout: 10000,
    retries: 3,
    circuitBreaker: {
      failureThreshold: 30,
      resetTimeout: 60000,
      monitoringPeriod: 30000,
    },
    batching: {
      enabled: true,
      maxBatchSize: 100,
      flushInterval: 5000,
    },
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (complianceClient) {
      await complianceClient.shutdown();
    }
  });

  return complianceClient;
}

export async function complianceMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip health checks and documentation
  if (
    request.url.startsWith('/health') ||
    request.url.startsWith('/documentation') ||
    request.url.startsWith('/metrics')
  ) {
    return;
  }

  // Extract user and tenant from request (if authenticated)
  const user: any = (request as any).user;
  const tenant_id = user?.tenant_id || 'anonymous';
  const user_id = user?.user_id;

  // Store start time
  const startTime = Date.now();

  // Log after response is sent (non-blocking)
  reply.raw.on('finish', () => {
    if (complianceClient) {
      const responseTime = Date.now() - startTime;

      // Log audit event asynchronously (batched)
      complianceClient
        .logAudit({
          tenant_id,
          user_id,
          action: `${request.method}_${request.url}`,
          resource_type: 'api_request',
          resource_id: request.id,
          metadata: {
            method: request.method,
            url: request.url,
            status_code: reply.statusCode,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            response_time_ms: responseTime,
          },
        })
        .catch((error) => {
          // Log error but don't fail the request
          request.log.warn({ error }, 'Failed to log audit event');
        });
    }
  });
}

export function getComplianceClient(): ComplianceClient | null {
  return complianceClient;
}
