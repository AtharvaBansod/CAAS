/**
 * Auth Service Instrumentation
 * Phase 5 - Observability
 * 
 * Initializes OpenTelemetry, metrics, and logging for the auth service
 */

import { initializeTelemetry } from '@caas/telemetry';

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Initialize telemetry before any other imports
const { metrics, shutdown } = initializeTelemetry({
  serviceName: 'auth-service',
  serviceVersion: '1.0.0',
  environment: config.NODE_ENV,
  otelCollectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
  logLevel: config.LOG_LEVEL as any,
});

export { metrics, shutdown };

// Export for use in other modules
export const telemetryMetrics = metrics;
export const shutdownTelemetry = shutdown;
