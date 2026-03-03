/**
 * Gateway Service Instrumentation
 * Phase 5 - Observability
 * 
 * Initializes OpenTelemetry, metrics, and logging for the gateway service
 */

import { initializeTelemetry } from '@caas/telemetry';
import { config } from './config';

// Initialize telemetry before any other imports
const { metrics, shutdown } = initializeTelemetry({
  serviceName: 'gateway',
  serviceVersion: '1.0.0',
  environment: config.NODE_ENV || 'development',
  otelCollectorUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
  enableTracing: true,
  enableMetrics: true,
  enableLogging: true,
  logLevel: config.LOG_LEVEL as any || 'info',
});

export { metrics, shutdown };

// Export for use in other modules
export const telemetryMetrics = metrics;
export const shutdownTelemetry = shutdown;
