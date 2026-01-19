# Gateway High Availability Architecture

> Visual architecture for highly available API gateway.

---

## Architecture Diagram

```
                     ┌─────────────────┐
                     │   DNS / CDN     │
                     │  (Cloudflare)   │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │    LB     │   │    LB     │   │    LB     │
        │  Zone A   │   │  Zone B   │   │  Zone C   │
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
    ┌─────────┴─────────┬─────┴─────┬─────────┴─────────┐
    │                   │           │                   │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Gateway│ │Gateway│ │Gateway│ │Gateway│ │Gateway│ │Gateway│
│  1A   │ │  2A   │ │  1B   │ │  2B   │ │  1C   │ │  2C   │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │         │         │         │         │
    └─────────┴─────────┴────┬────┴─────────┴─────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
        ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
        │   Redis     │ │ Auth    │ │  Backend   │
        │  Cluster    │ │ Service │ │  Services  │
        └─────────────┘ └─────────┘ └─────────────┘
```

---

## Health Checks

```typescript
// Kubernetes liveness probe
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Kubernetes readiness probe
app.get('/health/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    redis.ping(),
    checkAuthService(),
    checkBackendServices()
  ]);
  
  const healthy = checks.every(c => c.status === 'fulfilled');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'not_ready',
    checks: {
      redis: checks[0].status,
      auth: checks[1].status,
      backend: checks[2].status
    }
  });
});
```

---

## Load Balancer Configuration

```yaml
# Kubernetes Service
apiVersion: v1
kind: Service
metadata:
  name: gateway
spec:
  type: LoadBalancer
  selector:
    app: gateway
  ports:
    - port: 443
      targetPort: 8080
  sessionAffinity: None

---
# Pod Disruption Budget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: gateway
```

---

## Failover Strategy

| Component | Primary | Secondary | Failover Time |
|-----------|---------|-----------|---------------|
| DNS | Cloudflare | Route53 | 30s |
| Load Balancer | AWS ALB | NLB | Automatic |
| Gateway Pods | Zone A | Zone B/C | < 10s |
| Redis | Primary | Replica | < 5s |

---

## Related Documents
- [Circuit Breaker Pattern](./circuit-breaker-pattern.md)
- [Rate Limiting](../deepDive/publicGateway/rate-limiting.md)
