/**
 * Telemetry Types
 * Phase 5 - Observability
 */

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  otelCollectorUrl?: string;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  sampleRate?: number;
}

export interface CorrelationContext {
  correlationId: string;
  requestId?: string;
  tenantId?: string;
  clientId?: string;
  projectId?: string;
  userId?: string;
  conversationId?: string;
  traceId?: string;
  spanId?: string;
}

export interface LogContext extends Partial<CorrelationContext> {
  service: string;
  environment?: string;
  [key: string]: any;
}

export interface MetricLabels {
  service: string;
  environment?: string;
  method?: string;
  route?: string;
  status?: string;
  [key: string]: string | undefined;
}

export interface SpanAttributes {
  'service.name': string;
  'service.version'?: string;
  'deployment.environment'?: string;
  'tenant.id'?: string;
  'client.id'?: string;
  'project.id'?: string;
  'user.id'?: string;
  'conversation.id'?: string;
  'correlation.id'?: string;
  'request.id'?: string;
  [key: string]: any;
}
