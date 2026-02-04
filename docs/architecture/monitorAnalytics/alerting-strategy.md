# Monitoring & Analytics - Alerting Strategy

> **Parent Roadmap**: [Monitoring & Analytics](../../roadmaps/9_monitorLogAnalyticsCrawler.md)

---

## Overview

Alerting configuration and escalation procedures for CAAS services.

---

## 1. Alert Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 Critical | Service down | 5 minutes | API gateway unresponsive |
| P2 High | Major feature broken | 30 minutes | Auth service errors > 5% |
| P3 Medium | Performance degraded | 4 hours | Latency p99 > 500ms |
| P4 Low | Minor issues | 24 hours | Disk usage > 70% |

---

## 2. Alert Rules (Prometheus)

```yaml
# prometheus-rules.yaml
groups:
  - name: caas-critical
    rules:
      - alert: ServiceDown
        expr: up{job="caas-services"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5.."}[5m]) /
          rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "High error rate on {{ $labels.service }}"
          
      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: medium
        annotations:
          summary: "High latency on {{ $labels.service }}"
          
      - alert: DiskSpaceWarning
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.3
        for: 30m
        labels:
          severity: low
        annotations:
          summary: "Disk space running low on {{ $labels.instance }}"
```

---

## 3. Alertmanager Configuration

```yaml
# alertmanager.yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/xxx'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'default'
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      repeat_interval: 5m
      
    - match:
        severity: high
      receiver: 'slack-urgent'
      repeat_interval: 30m
      
    - match:
        severity: medium
      receiver: 'slack-ops'
      
    - match:
        severity: low
      receiver: 'email-ops'

receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_KEY}'
        severity: critical
        
  - name: 'slack-urgent'
    slack_configs:
      - channel: '#alerts-urgent'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        
  - name: 'slack-ops'
    slack_configs:
      - channel: '#alerts-ops'
        send_resolved: true
        
  - name: 'email-ops'
    email_configs:
      - to: 'ops@caas.io'
        send_resolved: true
```

---

## 4. Alert Suppression

```yaml
# Inhibit rules - suppress lower priority when higher exists
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'high'
    equal: ['alertname', 'service']
    
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '.*'
    equal: ['service']
```

---

## 5. Escalation Policy

```typescript
interface EscalationPolicy {
  name: string;
  steps: EscalationStep[];
}

interface EscalationStep {
  delayMinutes: number;
  notifyChannels: ('slack' | 'pagerduty' | 'email' | 'sms')[];
  targets: string[];
}

const criticalPolicy: EscalationPolicy = {
  name: 'Critical Incidents',
  steps: [
    {
      delayMinutes: 0,
      notifyChannels: ['slack', 'pagerduty'],
      targets: ['on-call-engineer']
    },
    {
      delayMinutes: 15,
      notifyChannels: ['slack', 'pagerduty', 'sms'],
      targets: ['engineering-lead', 'on-call-engineer']
    },
    {
      delayMinutes: 30,
      notifyChannels: ['slack', 'pagerduty', 'sms'],
      targets: ['engineering-manager', 'cto']
    }
  ]
};
```

---

## 6. Runbook Links

```yaml
# Include runbooks in alert annotations
- alert: DatabaseConnectionExhausted
  expr: mongodb_connections_current / mongodb_connections_available > 0.9
  annotations:
    summary: "Database connection pool exhausted"
    runbook: "https://wiki.caas.io/runbooks/mongodb-connections"
    actions: |
      1. Check for connection leaks
      2. Scale up connection pool
      3. Add read replicas if needed
```

---

## 7. Service-Specific Alerts

| Service | Critical Alert | High Alert |
|---------|---------------|------------|
| Gateway | 5xx > 10% | Latency p99 > 1s |
| Socket | Connections dropped > 1000/min | Memory > 90% |
| MongoDB | Replica lag > 10s | Connections > 80% |
| Kafka | Consumer lag > 100k | Under-replicated |
| Redis | Memory > 90% | Evictions > 1000/s |

---

## Related Documents
- [Logging Architecture](./logging-architecture.md)
- [Distributed Tracing](./distributed-tracing.md)
