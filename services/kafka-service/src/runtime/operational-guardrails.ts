/**
 * RT-QA-003: Operational Guardrails
 *
 * Runtime SLO monitoring, feature flags, incident detection,
 * and forensic logging for the Kafka persistence layer.
 */

// ── SLO Definitions ──

export interface SLODefinition {
  name: string;
  metric: string;
  target: number;
  unit: 'ms' | 'percent' | 'count' | 'per_second';
  window_seconds: number;
  alert_threshold: number;
  severity: 'warning' | 'critical' | 'page';
  runbook: string;
}

export const SLO_DEFINITIONS: SLODefinition[] = [
  {
    name: 'message_persistence_p99_latency',
    metric: 'message_persist_latency_ms',
    target: 500,
    unit: 'ms',
    window_seconds: 300,
    alert_threshold: 750,
    severity: 'warning',
    runbook: 'Check MongoDB write latency, verify connection pool, check disk I/O on primary',
  },
  {
    name: 'message_persistence_success_rate',
    metric: 'message_persist_success_ratio',
    target: 99.9,
    unit: 'percent',
    window_seconds: 300,
    alert_threshold: 99.0,
    severity: 'critical',
    runbook: 'Check DLQ rate, verify Kafka consumer lag, check MongoDB health, review persistence errors',
  },
  {
    name: 'dlq_rate',
    metric: 'dlq_messages_per_minute',
    target: 0,
    unit: 'per_second',
    window_seconds: 60,
    alert_threshold: 5,
    severity: 'critical',
    runbook: 'Check for schema validation failures, verify producer envelope compliance, review DLQ records',
  },
  {
    name: 'kafka_consumer_lag',
    metric: 'consumer_group_lag',
    target: 100,
    unit: 'count',
    window_seconds: 60,
    alert_threshold: 1000,
    severity: 'warning',
    runbook: 'Scale consumer instances, check processing bottlenecks, verify batch size tuning',
  },
  {
    name: 'search_propagation_latency',
    metric: 'search_index_latency_ms',
    target: 2000,
    unit: 'ms',
    window_seconds: 300,
    alert_threshold: 5000,
    severity: 'warning',
    runbook: 'Check Elasticsearch cluster health, verify bulk indexing performance, review search-service logs',
  },
  {
    name: 'duplicate_detection_rate',
    metric: 'duplicate_messages_per_minute',
    target: 0,
    unit: 'per_second',
    window_seconds: 300,
    alert_threshold: 10,
    severity: 'warning',
    runbook: 'Review producer dedup key generation, check for consumer group rebalance storms',
  },
];

// ── Feature Flags ──

export interface FeatureFlag {
  name: string;
  description: string;
  default_value: boolean;
  scope: 'global' | 'tenant' | 'project';
  category: 'realtime' | 'persistence' | 'search' | 'moderation' | 'social';
}

export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    name: 'realtime.dlq.enabled',
    description: 'Enable DLQ routing for unsupported/invalid envelopes',
    default_value: true,
    scope: 'global',
    category: 'realtime',
  },
  {
    name: 'realtime.retry.enabled',
    description: 'Enable retry consumer with exponential backoff',
    default_value: true,
    scope: 'global',
    category: 'persistence',
  },
  {
    name: 'realtime.schema_validation.strict',
    description: 'Enforce strict schema validation on inbound envelopes',
    default_value: false,
    scope: 'global',
    category: 'realtime',
  },
  {
    name: 'realtime.reactions.enabled',
    description: 'Enable message reaction events',
    default_value: true,
    scope: 'project',
    category: 'realtime',
  },
  {
    name: 'realtime.threads.enabled',
    description: 'Enable threaded reply events',
    default_value: true,
    scope: 'project',
    category: 'realtime',
  },
  {
    name: 'realtime.groups.enabled',
    description: 'Enable group lifecycle events',
    default_value: true,
    scope: 'project',
    category: 'realtime',
  },
  {
    name: 'realtime.planner.enabled',
    description: 'Enable planner/task events',
    default_value: true,
    scope: 'project',
    category: 'realtime',
  },
  {
    name: 'realtime.social.enabled',
    description: 'Enable social interaction events (posts, stories, follows)',
    default_value: true,
    scope: 'project',
    category: 'social',
  },
  {
    name: 'realtime.presence.invisible_mode',
    description: 'Allow users to set invisible/ghost mode',
    default_value: true,
    scope: 'tenant',
    category: 'realtime',
  },
  {
    name: 'persistence.batch.enabled',
    description: 'Enable batch message persistence (vs. single-write)',
    default_value: true,
    scope: 'global',
    category: 'persistence',
  },
  {
    name: 'search.realtime_indexing.enabled',
    description: 'Enable real-time search indexing from Kafka',
    default_value: true,
    scope: 'global',
    category: 'search',
  },
];

// ── Runtime Feature Flag Evaluator ──

export class FeatureFlagEvaluator {
  private overrides: Map<string, boolean> = new Map();

  constructor(private readonly envPrefix = 'FEATURE_FLAG_') {}

  isEnabled(flag: string, context?: { tenantId?: string; projectId?: string }): boolean {
    // Check explicit overrides first
    if (context?.projectId) {
      const projectKey = `${flag}:project:${context.projectId}`;
      if (this.overrides.has(projectKey)) return this.overrides.get(projectKey)!;
    }
    if (context?.tenantId) {
      const tenantKey = `${flag}:tenant:${context.tenantId}`;
      if (this.overrides.has(tenantKey)) return this.overrides.get(tenantKey)!;
    }
    if (this.overrides.has(flag)) return this.overrides.get(flag)!;

    // Check environment variable
    const envKey = this.envPrefix + flag.toUpperCase().replace(/\./g, '_');
    const envValue = process.env[envKey];
    if (envValue !== undefined) return envValue === 'true' || envValue === '1';

    // Fall back to default
    const definition = FEATURE_FLAGS.find((f) => f.name === flag);
    return definition?.default_value ?? false;
  }

  setOverride(flag: string, value: boolean, scope?: { tenantId?: string; projectId?: string }): void {
    if (scope?.projectId) {
      this.overrides.set(`${flag}:project:${scope.projectId}`, value);
    } else if (scope?.tenantId) {
      this.overrides.set(`${flag}:tenant:${scope.tenantId}`, value);
    } else {
      this.overrides.set(flag, value);
    }
  }

  removeOverride(flag: string, scope?: { tenantId?: string; projectId?: string }): void {
    if (scope?.projectId) {
      this.overrides.delete(`${flag}:project:${scope.projectId}`);
    } else if (scope?.tenantId) {
      this.overrides.delete(`${flag}:tenant:${scope.tenantId}`);
    } else {
      this.overrides.delete(flag);
    }
  }

  listFlags(): FeatureFlag[] {
    return [...FEATURE_FLAGS];
  }
}

// ── SLO Monitor ──

interface MetricSample {
  value: number;
  timestamp: number;
}

export class SLOMonitor {
  private samples: Map<string, MetricSample[]> = new Map();
  private alerts: Array<{
    slo: string;
    severity: string;
    value: number;
    threshold: number;
    timestamp: number;
    runbook: string;
  }> = [];

  record(metric: string, value: number): void {
    const now = Date.now();
    if (!this.samples.has(metric)) this.samples.set(metric, []);
    this.samples.get(metric)!.push({ value, timestamp: now });

    // Prune old samples (keep 10 minutes)
    const cutoff = now - 600_000;
    this.samples.set(
      metric,
      this.samples.get(metric)!.filter((s) => s.timestamp > cutoff)
    );

    // Check SLOs
    for (const slo of SLO_DEFINITIONS) {
      if (slo.metric !== metric) continue;
      const windowSamples = this.samples
        .get(metric)!
        .filter((s) => s.timestamp > now - slo.window_seconds * 1000);

      if (windowSamples.length === 0) continue;

      let aggregated: number;
      if (slo.unit === 'ms') {
        // p99 for latency
        const sorted = windowSamples.map((s) => s.value).sort((a, b) => a - b);
        const p99Index = Math.floor(sorted.length * 0.99);
        aggregated = sorted[Math.min(p99Index, sorted.length - 1)];
      } else if (slo.unit === 'percent') {
        aggregated = windowSamples.reduce((sum, s) => sum + s.value, 0) / windowSamples.length;
      } else {
        aggregated = windowSamples.reduce((sum, s) => sum + s.value, 0);
      }

      if (
        (slo.unit === 'percent' && aggregated < slo.alert_threshold) ||
        (slo.unit !== 'percent' && aggregated > slo.alert_threshold)
      ) {
        this.alerts.push({
          slo: slo.name,
          severity: slo.severity,
          value: aggregated,
          threshold: slo.alert_threshold,
          timestamp: now,
          runbook: slo.runbook,
        });

        console.error(
          `[SLO_ALERT] ${slo.severity.toUpperCase()} — ${slo.name}: ${aggregated} (threshold: ${slo.alert_threshold}) | Runbook: ${slo.runbook}`
        );
      }
    }
  }

  getAlerts(since?: number): typeof this.alerts {
    if (since) return this.alerts.filter((a) => a.timestamp > since);
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getMetricStats(metric: string, windowSeconds = 300): {
    count: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  } | null {
    const samples = this.samples.get(metric);
    if (!samples || samples.length === 0) return null;

    const cutoff = Date.now() - windowSeconds * 1000;
    const values = samples.filter((s) => s.timestamp > cutoff).map((s) => s.value).sort((a, b) => a - b);
    if (values.length === 0) return null;

    return {
      count: values.length,
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      min: values[0],
      max: values[values.length - 1],
    };
  }
}

// ── Incident Playbook ──

export interface IncidentPlaybook {
  id: string;
  title: string;
  trigger: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  steps: string[];
  escalation: string;
  rollback_steps: string[];
}

export const INCIDENT_PLAYBOOKS: IncidentPlaybook[] = [
  {
    id: 'INC-KAFKA-001',
    title: 'Kafka Consumer Lag Spike',
    trigger: 'Consumer group lag exceeds 1000 for message-persistence group',
    severity: 'P2',
    steps: [
      '1. Check kafka-service health endpoint: GET /health',
      '2. Review consumer metrics: docker logs caas-kafka-service | grep ConsumerLag',
      '3. Check MongoDB write latency: db.serverStatus().opLatencies',
      '4. Verify Kafka broker health via Kafka UI',
      '5. If MongoDB slow: check replica set status, disk I/O, connection pool',
      '6. If Kafka broker issues: check broker logs, ZooKeeper health',
      '7. Scale consumers if processing bottleneck: increase partition count and consumer instances',
    ],
    escalation: 'Page on-call engineer if lag exceeds 5000 or persists > 10 minutes',
    rollback_steps: [
      'Restart kafka-service: docker restart caas-kafka-service',
      'If MongoDB corruption: fail over to secondary replica',
      'If Kafka broker down: restart broker, verify ISR recovery',
    ],
  },
  {
    id: 'INC-DLQ-001',
    title: 'High DLQ Rate',
    trigger: 'DLQ messages exceed 5/minute for 3 consecutive minutes',
    severity: 'P1',
    steps: [
      '1. Check DLQ records: consume from internal.dlq via Kafka UI',
      '2. Identify failure reason (UNSUPPORTED_EVENT_TYPE, INVALID_JSON, PERSISTENCE_ERROR)',
      '3. If UNSUPPORTED_EVENT_TYPE: check producer code for wrong event_type strings',
      '4. If INVALID_JSON: check network/proxy corruption, producer serialization',
      '5. If PERSISTENCE_ERROR: check MongoDB health and indexes',
      '6. Review recent deployments for schema breaking changes',
      '7. Check schema registry compatibility settings',
    ],
    escalation: 'Page platform team lead if DLQ rate > 50/minute',
    rollback_steps: [
      'If caused by deployment: rollback to previous image tag',
      'Disable strict schema validation: set FEATURE_FLAG_REALTIME_SCHEMA_VALIDATION_STRICT=false',
      'Replay DLQ records after fix: use internal.retry topic',
    ],
  },
  {
    id: 'INC-PERSIST-001',
    title: 'Message Persistence Failure',
    trigger: 'Persistence success rate drops below 99%',
    severity: 'P1',
    steps: [
      '1. Check kafka-service health: GET /health on port 3010',
      '2. Review persistence error logs: docker logs caas-kafka-service | grep "Error flushing"',
      '3. Check MongoDB replica set status: rs.status()',
      '4. Verify unique indexes are not causing bulk insert failures',
      '5. Check Redis cache health for conversation cache invalidation',
      '6. Review message buffer size and flush interval settings',
    ],
    escalation: 'Immediate P1 page if success rate < 95%',
    rollback_steps: [
      'Reduce batch size: set MESSAGE_PERSISTENCE_BATCH_SIZE=1',
      'Increase flush interval: set MESSAGE_PERSISTENCE_FLUSH_INTERVAL_MS=5000',
      'Restart kafka-service with single-write mode',
    ],
  },
  {
    id: 'INC-SOCKET-001',
    title: 'Socket Service Connection Storm',
    trigger: 'Connection rate exceeds 500 connections/second or total connections > 10000',
    severity: 'P2',
    steps: [
      '1. Check socket-service health endpoints on both nodes',
      '2. Review connection metrics: docker logs caas-socket-1 | grep "connection"',
      '3. Check for DDoS or bot traffic patterns',
      '4. Verify Redis adapter is functioning (pub/sub between nodes)',
      '5. Check auth-service JWT validation latency',
      '6. Review client reconnection backoff settings',
    ],
    escalation: 'Page if connections > 25000 or auth-service degraded',
    rollback_steps: [
      'Enable connection rate limiting at gateway level',
      'Scale socket-service instances',
      'Block suspicious IP ranges at load balancer',
    ],
  },
  {
    id: 'INC-SEARCH-001',
    title: 'Search Indexing Lag',
    trigger: 'Search propagation latency exceeds 5000ms',
    severity: 'P3',
    steps: [
      '1. Check Elasticsearch cluster health: GET /_cluster/health',
      '2. Review search-service logs for indexing errors',
      '3. Check Elasticsearch disk usage and JVM heap',
      '4. Verify bulk indexing batch size is appropriate',
      '5. Check Kafka consumer lag for search consumer group',
    ],
    escalation: 'Page if search completely unavailable or lag > 60 seconds',
    rollback_steps: [
      'Reduce bulk index batch size',
      'Restart search-service: docker restart caas-search-service',
      'If ES cluster red: force-allocate unassigned shards',
    ],
  },
];

// ── Forensic Logger ──

export interface ForensicLogEntry {
  timestamp: string;
  correlation_id: string;
  event_type: string;
  tenant_id: string;
  stage: 'socket_receive' | 'kafka_produce' | 'kafka_consume' | 'mongo_persist' | 'search_index' | 'dlq_route' | 'retry';
  latency_ms: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class ForensicLogger {
  private entries: ForensicLogEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  log(entry: Omit<ForensicLogEntry, 'timestamp'>): void {
    const full: ForensicLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(full);

    // Ring buffer
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Console output for container log aggregation
    console.log(`[FORENSIC] ${full.stage} | ${full.event_type} | ${full.correlation_id} | ${full.latency_ms}ms | ${full.success ? 'OK' : 'FAIL'}`);
  }

  query(filter: {
    correlation_id?: string;
    tenant_id?: string;
    event_type?: string;
    stage?: string;
    success?: boolean;
    since?: string;
  }): ForensicLogEntry[] {
    return this.entries.filter((e) => {
      if (filter.correlation_id && e.correlation_id !== filter.correlation_id) return false;
      if (filter.tenant_id && e.tenant_id !== filter.tenant_id) return false;
      if (filter.event_type && e.event_type !== filter.event_type) return false;
      if (filter.stage && e.stage !== filter.stage) return false;
      if (filter.success !== undefined && e.success !== filter.success) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  getTraceForCorrelation(correlationId: string): ForensicLogEntry[] {
    return this.entries
      .filter((e) => e.correlation_id === correlationId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  getFailuresSince(since: string): ForensicLogEntry[] {
    return this.entries.filter(
      (e) => !e.success && e.timestamp >= since
    );
  }

  getStats(windowMs = 300_000): {
    total: number;
    successes: number;
    failures: number;
    avg_latency_ms: number;
    by_stage: Record<string, { count: number; avg_latency: number }>;
  } {
    const cutoff = new Date(Date.now() - windowMs).toISOString();
    const recent = this.entries.filter((e) => e.timestamp >= cutoff);
    const byStage: Record<string, { count: number; total_latency: number }> = {};

    for (const e of recent) {
      if (!byStage[e.stage]) byStage[e.stage] = { count: 0, total_latency: 0 };
      byStage[e.stage].count++;
      byStage[e.stage].total_latency += e.latency_ms;
    }

    return {
      total: recent.length,
      successes: recent.filter((e) => e.success).length,
      failures: recent.filter((e) => !e.success).length,
      avg_latency_ms: recent.length > 0
        ? recent.reduce((s, e) => s + e.latency_ms, 0) / recent.length
        : 0,
      by_stage: Object.fromEntries(
        Object.entries(byStage).map(([stage, data]) => [
          stage,
          { count: data.count, avg_latency: data.total_latency / data.count },
        ])
      ),
    };
  }
}
