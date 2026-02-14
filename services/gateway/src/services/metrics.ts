/**
 * Metrics Service
 * 
 * Prometheus metrics collection for monitoring
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
  private registry: Registry;
  
  // HTTP metrics
  public httpRequestsTotal: Counter;
  public httpRequestDuration: Histogram;
  public httpRequestSize: Histogram;
  public httpResponseSize: Histogram;
  
  // Gateway metrics
  public activeConnections: Gauge;
  public conversationsTotal: Gauge;
  public messagesTotal: Counter;
  
  // Error metrics
  public errorsTotal: Counter;
  
  constructor() {
    this.registry = new Registry();
    
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });
    
    // HTTP request counter
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    
    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.registry],
    });
    
    // HTTP request size histogram
    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });
    
    // HTTP response size histogram
    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });
    
    // Active connections gauge
    this.activeConnections = new Gauge({
      name: 'gateway_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });
    
    // Total conversations gauge
    this.conversationsTotal = new Gauge({
      name: 'gateway_conversations_total',
      help: 'Total number of conversations',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });
    
    // Total messages counter
    this.messagesTotal = new Counter({
      name: 'gateway_messages_total',
      help: 'Total number of messages',
      labelNames: ['tenant_id', 'conversation_id'],
      registers: [this.registry],
    });
    
    // Errors counter
    this.errorsTotal = new Counter({
      name: 'gateway_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'code'],
      registers: [this.registry],
    });
  }
  
  /**
   * Record HTTP request
   */
  recordRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSeconds);
  }
  
  /**
   * Record request size
   */
  recordRequestSize(method: string, route: string, sizeBytes: number): void {
    this.httpRequestSize.observe({ method, route }, sizeBytes);
  }
  
  /**
   * Record response size
   */
  recordResponseSize(method: string, route: string, statusCode: number, sizeBytes: number): void {
    this.httpResponseSize.observe({ method, route, status_code: statusCode }, sizeBytes);
  }
  
  /**
   * Increment active connections
   */
  incrementConnections(): void {
    this.activeConnections.inc();
  }
  
  /**
   * Decrement active connections
   */
  decrementConnections(): void {
    this.activeConnections.dec();
  }
  
  /**
   * Set conversations total
   */
  setConversationsTotal(tenantId: string, count: number): void {
    this.conversationsTotal.set({ tenant_id: tenantId }, count);
  }
  
  /**
   * Increment messages total
   */
  incrementMessages(tenantId: string, conversationId: string): void {
    this.messagesTotal.inc({ tenant_id: tenantId, conversation_id: conversationId });
  }
  
  /**
   * Record error
   */
  recordError(type: string, code: string | number): void {
    this.errorsTotal.inc({ type, code: String(code) });
  }
  
  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  /**
   * Get registry
   */
  getRegistry(): Registry {
    return this.registry;
  }
}

// Singleton instance
export const metricsService = new MetricsService();
