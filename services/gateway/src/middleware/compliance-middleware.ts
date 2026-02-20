/**
 * Compliance Middleware
 * Phase 4.5.1 - Task 03: Gateway Compliance Integration
 * 
 * Logs all gateway requests to compliance service for audit trail
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import axios, { AxiosInstance } from 'axios';

// Simplified compliance client for gateway
class SimpleComplianceClient {
  private client: AxiosInstance;
  private batchBuffer: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.startBatchFlushing();
  }

  async logAudit(event: any): Promise<void> {
    this.batchBuffer.push(event);
    if (this.batchBuffer.length >= 100) {
      await this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) return;
    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await this.client.post('/api/v1/audit/batch', { events: batch });
    } catch (error) {
      console.error('Failed to flush audit batch:', error);
      this.batchBuffer.unshift(...batch);
    }
  }

  private startBatchFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushBatch().catch(console.error);
    }, 5000);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushBatch();
  }
}

let complianceClient: SimpleComplianceClient | null = null;

export function initializeComplianceClient(baseURL: string) {
  complianceClient = new SimpleComplianceClient(baseURL);

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

export function getComplianceClient(): SimpleComplianceClient | null {
  return complianceClient;
}
