/**
 * RT-QA-003 – Operational Guardrails for Realtime Reliability
 *
 * This module provides:
 *  1. Runtime feature flags for staged event rollout & emergency disable
 *  2. SLO-linked realtime alert definitions
 *  3. Incident playbook references
 *  4. Post-incident forensic helpers using trace/log/correlation data
 *
 * Works in tandem with feature-gates.ts (canary rollout) and
 * socket-metrics.ts (metric counters).
 */

// ── 1. SLO definitions ───────────────────────────────────────

export interface SloDefinition {
  id: string;
  name: string;
  target: number;          // e.g. 0.999 = 99.9 %
  window_minutes: number;  // rolling window
  metric: string;          // Prometheus-style metric name
  comparator: 'gte' | 'lte';
  severity: 'warning' | 'critical';
  playbook_ref: string;    // pointer into INCIDENT_PLAYBOOKS
}

export const REALTIME_SLO_DEFINITIONS: SloDefinition[] = [
  {
    id: 'slo-socket-connect-success',
    name: 'Socket Connect Success Rate',
    target: 0.999,
    window_minutes: 5,
    metric: 'socket_connect_success_ratio',
    comparator: 'gte',
    severity: 'critical',
    playbook_ref: 'PB-SOCKET-CONNECT',
  },
  {
    id: 'slo-message-ack-p99',
    name: 'Message Ack P99 Latency',
    target: 500,  // ms
    window_minutes: 5,
    metric: 'socket_message_ack_p99_ms',
    comparator: 'lte',
    severity: 'warning',
    playbook_ref: 'PB-MESSAGE-LATENCY',
  },
  {
    id: 'slo-kafka-persistence-lag',
    name: 'Kafka Persistence Consumer Lag',
    target: 1000,  // messages
    window_minutes: 5,
    metric: 'kafka_consumer_lag_messages',
    comparator: 'lte',
    severity: 'critical',
    playbook_ref: 'PB-KAFKA-LAG',
  },
  {
    id: 'slo-dlq-rate',
    name: 'DLQ Rate (should be near zero)',
    target: 10,   // messages per window
    window_minutes: 15,
    metric: 'kafka_dlq_messages_total',
    comparator: 'lte',
    severity: 'warning',
    playbook_ref: 'PB-DLQ-SPIKE',
  },
  {
    id: 'slo-presence-freshness',
    name: 'Presence Update Freshness',
    target: 3000,  // ms max staleness
    window_minutes: 5,
    metric: 'presence_update_staleness_p99_ms',
    comparator: 'lte',
    severity: 'warning',
    playbook_ref: 'PB-PRESENCE-STALE',
  },
];

// ── 2. Incident playbooks ────────────────────────────────────

export interface IncidentPlaybook {
  id: string;
  title: string;
  symptoms: string[];
  diagnosis_steps: string[];
  mitigation_steps: string[];
  escalation: string;
  forensic_queries: string[];
}

export const INCIDENT_PLAYBOOKS: Record<string, IncidentPlaybook> = {
  'PB-SOCKET-CONNECT': {
    id: 'PB-SOCKET-CONNECT',
    title: 'Socket Connection Failure Spike',
    symptoms: [
      'Alert: socket_connect_success_ratio < 99.9 % over 5 min',
      'Client-side reconnect loops reported',
      'Connection tracker shows declining count',
    ],
    diagnosis_steps: [
      '1. Check `docker compose logs socket-service-1 socket-service-2` for auth errors or OOM kills',
      '2. Verify Redis adapter connectivity: `redis-cli -h redis-socket -a <pw> PING`',
      '3. Check auth-service health: `curl http://auth-service:3001/health`',
      '4. Review Socket.IO connection count: `curl http://socket-service-1:3002/metrics/json`',
    ],
    mitigation_steps: [
      '• If auth-service is unhealthy: restart `docker compose restart auth-service`',
      '• If Redis is overloaded: increase maxmemory or restart `docker compose restart redis-socket`',
      '• Emergency: disable non-critical namespaces via REALTIME_DISABLED_NAMESPACES=social,webrtc',
      '• Scale: start additional socket-service replicas',
    ],
    escalation: 'Platform-on-call → Infra team if not resolved within 10 min',
    forensic_queries: [
      'grep "connect_error" /var/log/socket-service/*.log | tail -100',
      'docker compose logs --since 10m socket-service-1 | grep -i "error\\|ECONNREFUSED"',
    ],
  },
  'PB-MESSAGE-LATENCY': {
    id: 'PB-MESSAGE-LATENCY',
    title: 'Message Ack Latency Degradation',
    symptoms: [
      'P99 message ack latency > 500 ms',
      'Users report sluggish chat',
    ],
    diagnosis_steps: [
      '1. Check Kafka producer latency in socket-service logs',
      '2. Inspect broker health: `docker compose exec kafka-1 kafka-broker-api-versions --bootstrap-server localhost:29092`',
      '3. Check MongoDB insert latency via slow query log',
    ],
    mitigation_steps: [
      '• If Kafka slow: check disk I/O on broker containers',
      '• If MongoDB slow: check replica set status `rs.status()` and index usage',
      '• Reduce batch size: MESSAGE_PERSISTENCE_BATCH_SIZE=10',
    ],
    escalation: 'Backend-on-call → DBA if MongoDB-related',
    forensic_queries: [
      'correlation_id in socket-service logs → kafka-service logs → mongodb slow query',
    ],
  },
  'PB-KAFKA-LAG': {
    id: 'PB-KAFKA-LAG',
    title: 'Kafka Consumer Lag Critical',
    symptoms: [
      'Consumer group lag > 1000 messages',
      'Persistence delay > 30 s',
    ],
    diagnosis_steps: [
      '1. Check consumer group status: `kafka-consumer-groups --bootstrap-server kafka-1:29092 --describe --group message-persistence`',
      '2. Inspect for consumer crashes in kafka-service logs',
      '3. Check if topic partitions are balanced',
    ],
    mitigation_steps: [
      '• Restart consumer: `docker compose restart kafka-service`',
      '• If stuck: reset offsets to latest (data loss trade-off) or add consumer instances',
      '• Check for poison pill (DLQ should have caught it – look at DLQ topic)',
    ],
    escalation: 'Backend-on-call → Kafka admin',
    forensic_queries: [
      'kafka-consumer-groups --describe --group message-persistence',
      'docker compose logs kafka-service | grep "ERROR\\|rebalance"',
    ],
  },
  'PB-DLQ-SPIKE': {
    id: 'PB-DLQ-SPIKE',
    title: 'Dead Letter Queue Spike',
    symptoms: [
      'DLQ message rate > 10 in 15 min window',
      'Schema validation failures increasing',
    ],
    diagnosis_steps: [
      '1. Read DLQ messages: consume from internal.dlq and inspect _dlq_reason',
      '2. Check for schema compatibility issues in confluent schema-registry logs',
      '3. Look for recently deployed event producers with breaking changes',
    ],
    mitigation_steps: [
      '• If schema issue: rollback producer deployment',
      '• If transient: messages will be retried via internal.retry',
      '• Manual replay: publish DLQ messages back to original topic after fix',
    ],
    escalation: 'Backend-on-call → Schema governance owner',
    forensic_queries: [
      'kafkacat -b kafka-1:29092 -t internal.dlq -C -o -10 -e',
    ],
  },
  'PB-PRESENCE-STALE': {
    id: 'PB-PRESENCE-STALE',
    title: 'Presence Data Staleness',
    symptoms: [
      'Users appear online when they are offline',
      'P99 staleness > 3 s',
    ],
    diagnosis_steps: [
      '1. Check Redis presence keys TTL: `redis-cli -h redis-socket KEYS presence:*`',
      '2. Verify presence namespace is not disabled via feature flags',
      '3. Check idle timeout configuration',
    ],
    mitigation_steps: [
      '• Restart presence idle-check interval',
      '• Flush stale keys: careful – may briefly show everyone offline',
      '• Increase heartbeat frequency if network-related',
    ],
    escalation: 'Backend-on-call',
    forensic_queries: [
      'redis-cli -h redis-socket KEYS "presence:status:*" | head -20',
    ],
  },
};

// ── 3. Runtime flag helpers ──────────────────────────────────

/**
 * Emergency disable an event at runtime by setting env vars.
 * In a real system you'd use a config service or Redis flag.
 * This returns the env-var string you need to set.
 */
export function getEmergencyDisableEnv(namespace: string, event?: string): string {
  if (event) {
    return `REALTIME_DISABLED_EVENTS=${namespace}:${event}`;
  }
  return `REALTIME_DISABLED_NAMESPACES=${namespace}`;
}

/**
 * Build a canary rollout env-var override for progressive traffic.
 */
export function getCanaryRolloutEnv(namespace: string, event: string, percent: number): Record<string, string> {
  return {
    REALTIME_CANARY_EVENTS: `${namespace}:${event}`,
    REALTIME_CANARY_PERCENT: String(Math.max(0, Math.min(100, percent))),
  };
}

// ── 4. Forensic correlation helper ───────────────────────────

export interface ForensicTrace {
  correlation_id: string;
  event_type: string;
  expected_path: string[];
  log_queries: string[];
}

/**
 * Given a correlation_id (usually = message_id or event_id), produce
 * a set of targeted log/metric queries for post-incident analysis.
 */
export function buildForensicTrace(correlationId: string, eventType: string): ForensicTrace {
  const topic = eventType.startsWith('message.') ? 'chat.messages' : 'message-events';
  return {
    correlation_id: correlationId,
    event_type: eventType,
    expected_path: [
      `socket-service → emit ${eventType}`,
      `socket-service → kafka-producer → topic:${topic}`,
      `kafka-service → consumer → MongoDB persist`,
      `kafka-service → persistence-notifier → topic:chat.persistence.events`,
    ],
    log_queries: [
      `docker compose logs socket-service-1 socket-service-2 | grep "${correlationId}"`,
      `docker compose logs kafka-service | grep "${correlationId}"`,
      `kafkacat -b kafka-1:29092 -t ${topic} -C -o beginning -e | grep "${correlationId}"`,
      `kafkacat -b kafka-1:29092 -t internal.dlq -C -o beginning -e | grep "${correlationId}"`,
      `docker compose exec mongodb-primary mongosh --quiet --eval 'db.messages.find({message_id: "${correlationId}"}).pretty()'`,
    ],
  };
}

// ── Exports ──────────────────────────────────────────────────

export function listAllSlos(): SloDefinition[] {
  return [...REALTIME_SLO_DEFINITIONS];
}

export function getPlaybook(id: string): IncidentPlaybook | undefined {
  return INCIDENT_PLAYBOOKS[id];
}

export function listPlaybooks(): IncidentPlaybook[] {
  return Object.values(INCIDENT_PLAYBOOKS);
}
