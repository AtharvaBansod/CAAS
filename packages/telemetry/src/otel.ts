/**
 * OpenTelemetry Instrumentation
 * Phase 5 - Observability
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TelemetryConfig } from './types';
import * as api from '@opentelemetry/api';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry SDK
 */
export function initializeOTel(config: TelemetryConfig): NodeSDK {
  if (sdk) {
    console.warn('OpenTelemetry SDK already initialized');
    return sdk;
  }

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
    'service.namespace': 'caas',
  });

  const otelCollectorUrl = config.otelCollectorUrl || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317';

  // Trace Exporter
  const traceExporter = new OTLPTraceExporter({
    url: otelCollectorUrl,
  });

  // Metric Exporter
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: otelCollectorUrl,
    }),
    exportIntervalMillis: 10000,
  });

  // Log Exporter
  const logExporter = new OTLPLogExporter({
    url: otelCollectorUrl,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    logRecordProcessor: new BatchLogRecordProcessor(logExporter),
    spanProcessor: new BatchSpanProcessor(traceExporter),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable fs instrumentation to reduce noise
        },
        '@opentelemetry/instrumentation-http': {
          enabled: config.enableTracing !== false,
        },
        '@opentelemetry/instrumentation-fastify': {
          enabled: config.enableTracing !== false,
        },
        '@opentelemetry/instrumentation-mongodb': {
          enabled: config.enableTracing !== false,
        },
        '@opentelemetry/instrumentation-redis-4': {
          enabled: config.enableTracing !== false,
        },
      }),
    ],
  });

  // Start SDK
  sdk.start();

  console.log(`OpenTelemetry initialized for ${config.serviceName}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

/**
 * Get current tracer
 */
export function getTracer(name: string) {
  return api.trace.getTracer(name);
}

/**
 * Get current meter
 */
export function getMeter(name: string) {
  return api.metrics.getMeter(name);
}

/**
 * Create a span
 */
export function createSpan(name: string, attributes?: Record<string, any>) {
  const tracer = api.trace.getTracer('default');
  return tracer.startSpan(name, {
    attributes: attributes || {},
  });
}

/**
 * Shutdown OpenTelemetry SDK
 */
export async function shutdownOTel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log('OpenTelemetry SDK shut down');
  }
}