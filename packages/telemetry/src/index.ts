/**
 * CAAS Platform Telemetry Package
 * Phase 5 - Observability Infrastructure
 * 
 * Provides unified instrumentation for:
 * - OpenTelemetry tracing
 * - Prometheus metrics
 * - Structured logging
 * - Correlation ID propagation
 */

export * from './otel';
export * from './metrics';
export * from './logger';
export * from './correlation';
export * from './types';

import { TelemetryConfig } from './types';
import { initializeOTel, shutdownOTel } from './otel';
import { initializeLogger } from './logger';
import { MetricsCollector } from './metrics';

/**
 * Initialize complete telemetry stack
 */
export function initializeTelemetry(config: TelemetryConfig): {
  metrics: MetricsCollector;
  shutdown: () => Promise<void>;
} {
  // Initialize OpenTelemetry
  if (config.enableTracing !== false) {
    initializeOTel(config);
  }

  // Initialize Logger
  if (config.enableLogging !== false) {
    initializeLogger(config);
  }

  // Initialize Metrics
  const metrics = new MetricsCollector(config.serviceName);

  return {
    metrics,
    shutdown: shutdownOTel,
  };
}
