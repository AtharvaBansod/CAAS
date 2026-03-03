/**
 * Correlation ID Management
 * Phase 5 - Observability
 * 
 * Provides correlation ID generation and propagation
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { CorrelationContext } from './types';
import * as api from '@opentelemetry/api';

const asyncLocalStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Get current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Set correlation context
 */
export function setCorrelationContext(context: CorrelationContext): void {
  asyncLocalStorage.enterWith(context);
}

/**
 * Run with correlation context
 */
export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Extract correlation context from headers
 */
export function extractCorrelationFromHeaders(headers: Record<string, string | string[] | undefined>): Partial<CorrelationContext> {
  const getHeader = (key: string): string | undefined => {
    const value = headers[key] || headers[key.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  // Get trace context from OpenTelemetry
  const span = api.trace.getActiveSpan();
  const spanContext = span?.spanContext();

  return {
    correlationId: getHeader('x-correlation-id') || generateCorrelationId(),
    requestId: getHeader('x-request-id'),
    tenantId: getHeader('x-tenant-id'),
    clientId: getHeader('x-client-id'),
    projectId: getHeader('x-project-id'),
    userId: getHeader('x-user-id'),
    conversationId: getHeader('x-conversation-id'),
    traceId: spanContext?.traceId,
    spanId: spanContext?.spanId,
  };
}

/**
 * Inject correlation context into headers
 */
export function injectCorrelationIntoHeaders(
  headers: Record<string, string>,
  context?: CorrelationContext
): Record<string, string> {
  const ctx = context || getCorrelationContext();
  if (!ctx) {
    return headers;
  }

  const result = { ...headers };

  if (ctx.correlationId) result['x-correlation-id'] = ctx.correlationId;
  if (ctx.requestId) result['x-request-id'] = ctx.requestId;
  if (ctx.tenantId) result['x-tenant-id'] = ctx.tenantId;
  if (ctx.clientId) result['x-client-id'] = ctx.clientId;
  if (ctx.projectId) result['x-project-id'] = ctx.projectId;
  if (ctx.userId) result['x-user-id'] = ctx.userId;
  if (ctx.conversationId) result['x-conversation-id'] = ctx.conversationId;

  return result;
}

/**
 * Create correlation middleware for Fastify
 */
export function createCorrelationMiddleware() {
  return async (request: any, reply: any) => {
    const context = extractCorrelationFromHeaders(request.headers);
    
    // Set correlation context
    setCorrelationContext(context as CorrelationContext);

    // Add correlation ID to response headers
    reply.header('x-correlation-id', context.correlationId);

    // Add correlation context to request
    request.correlationContext = context;
  };
}

/**
 * Get correlation attributes for spans
 */
export function getCorrelationAttributes(): Record<string, string> {
  const context = getCorrelationContext();
  if (!context) {
    return {};
  }

  const attributes: Record<string, string> = {};

  if (context.correlationId) attributes['correlation.id'] = context.correlationId;
  if (context.requestId) attributes['request.id'] = context.requestId;
  if (context.tenantId) attributes['tenant.id'] = context.tenantId;
  if (context.clientId) attributes['client.id'] = context.clientId;
  if (context.projectId) attributes['project.id'] = context.projectId;
  if (context.userId) attributes['user.id'] = context.userId;
  if (context.conversationId) attributes['conversation.id'] = context.conversationId;

  return attributes;
}
