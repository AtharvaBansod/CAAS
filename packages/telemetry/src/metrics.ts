/**
 * Metrics Module
 * Phase 5 - Observability
 * 
 * Provides Prometheus-compatible metrics collection
 */

import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';
import { MetricLabels } from './types';

export class MetricsCollector {
  private registry: Registry;
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private httpRequestErrors: Counter<string>;
  private socketConnectionsActive: Gauge<string>;
  private socketEventsTotal: Counter<string>;
  private kafkaMessagesProduced: Counter<string>;
  private kafkaMessagesConsumed: Counter<string>;
  private kafkaConsumerLag: Gauge<string>;
  private authAttempts: Counter<string>;
  private authFailures: Counter<string>;
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;

  constructor(serviceName: string) {
    this.registry = new Registry();
    
    // Sanitize service name for Prometheus (replace hyphens with underscores)
    const sanitizedServiceName = serviceName.replace(/-/g, '_');
    
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ 
      register: this.registry,
      prefix: `${sanitizedServiceName}_`,
    });

    // HTTP Metrics
    this.httpRequestDuration = new Histogram({
      name: `${sanitizedServiceName}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status', 'tenant_id', 'client_id'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: `${sanitizedServiceName}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'tenant_id', 'client_id'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: `${sanitizedServiceName}_http_request_errors_total`,
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status', 'error_type'],
      registers: [this.registry],
    });

    // Socket Metrics
    this.socketConnectionsActive = new Gauge({
      name: `${sanitizedServiceName}_socket_connections_active`,
      help: 'Number of active socket connections',
      labelNames: ['namespace', 'tenant_id'],
      registers: [this.registry],
    });

    this.socketEventsTotal = new Counter({
      name: `${sanitizedServiceName}_socket_events_total`,
      help: 'Total number of socket events',
      labelNames: ['namespace', 'event', 'tenant_id', 'status'],
      registers: [this.registry],
    });

    // Kafka Metrics
    this.kafkaMessagesProduced = new Counter({
      name: `${sanitizedServiceName}_kafka_messages_produced_total`,
      help: 'Total number of Kafka messages produced',
      labelNames: ['topic', 'tenant_id'],
      registers: [this.registry],
    });

    this.kafkaMessagesConsumed = new Counter({
      name: `${sanitizedServiceName}_kafka_messages_consumed_total`,
      help: 'Total number of Kafka messages consumed',
      labelNames: ['topic', 'group', 'status'],
      registers: [this.registry],
    });

    this.kafkaConsumerLag = new Gauge({
      name: `${sanitizedServiceName}_kafka_consumer_lag`,
      help: 'Kafka consumer lag',
      labelNames: ['topic', 'partition', 'group'],
      registers: [this.registry],
    });

    // Auth Metrics
    this.authAttempts = new Counter({
      name: `${sanitizedServiceName}_auth_attempts_total`,
      help: 'Total number of authentication attempts',
      labelNames: ['type', 'tenant_id', 'client_id'],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: `${sanitizedServiceName}_auth_failures_total`,
      help: 'Total number of authentication failures',
      labelNames: ['type', 'reason', 'tenant_id', 'client_id'],
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: `${sanitizedServiceName}_cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['cache_type', 'key_prefix'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: `${sanitizedServiceName}_cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['cache_type', 'key_prefix'],
      registers: [this.registry],
    });
  }

  // HTTP Metrics Methods
  recordHttpRequest(method: string, route: string, status: number, duration: number, labels?: Partial<MetricLabels>) {
    const metricLabels = {
      method,
      route,
      status: status.toString(),
      tenant_id: labels?.tenant_id || 'unknown',
      client_id: labels?.client_id || 'unknown',
    };

    this.httpRequestDuration.observe(metricLabels, duration);
    this.httpRequestTotal.inc(metricLabels);

    if (status >= 400) {
      this.httpRequestErrors.inc({
        method,
        route,
        status: status.toString(),
        error_type: status >= 500 ? 'server_error' : 'client_error',
      });
    }
  }

  // Socket Metrics Methods
  setSocketConnections(namespace: string, count: number, tenantId?: string) {
    this.socketConnectionsActive.set(
      { namespace, tenant_id: tenantId || 'unknown' },
      count
    );
  }

  recordSocketEvent(namespace: string, event: string, status: 'success' | 'error', tenantId?: string) {
    this.socketEventsTotal.inc({
      namespace,
      event,
      tenant_id: tenantId || 'unknown',
      status,
    });
  }

  // Kafka Metrics Methods
  recordKafkaProduced(topic: string, tenantId?: string) {
    this.kafkaMessagesProduced.inc({
      topic,
      tenant_id: tenantId || 'unknown',
    });
  }

  recordKafkaConsumed(topic: string, group: string, status: 'success' | 'error') {
    this.kafkaMessagesConsumed.inc({ topic, group, status });
  }

  setKafkaConsumerLag(topic: string, partition: number, group: string, lag: number) {
    this.kafkaConsumerLag.set(
      { topic, partition: partition.toString(), group },
      lag
    );
  }

  // Auth Metrics Methods
  recordAuthAttempt(type: string, tenantId?: string, clientId?: string) {
    this.authAttempts.inc({
      type,
      tenant_id: tenantId || 'unknown',
      client_id: clientId || 'unknown',
    });
  }

  recordAuthFailure(type: string, reason: string, tenantId?: string, clientId?: string) {
    this.authFailures.inc({
      type,
      reason,
      tenant_id: tenantId || 'unknown',
      client_id: clientId || 'unknown',
    });
  }

  // Cache Metrics Methods
  recordCacheHit(cacheType: string, keyPrefix: string) {
    this.cacheHits.inc({ cache_type: cacheType, key_prefix: keyPrefix });
  }

  recordCacheMiss(cacheType: string, keyPrefix: string) {
    this.cacheMisses.inc({ cache_type: cacheType, key_prefix: keyPrefix });
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get registry
  getRegistry(): Registry {
    return this.registry;
  }
}