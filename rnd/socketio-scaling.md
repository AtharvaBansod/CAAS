# Socket.IO Horizontal Scaling

> Research on scaling Socket.IO across multiple servers.

---

## Overview

Strategies for horizontal scaling of WebSocket connections.

---

## Scaling Approaches

### 1. Redis Adapter (Recommended)
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Pros:**
- Simple setup
- Broadcast support
- Room management
- Active community

**Cons:**
- Single Redis = single point of failure
- Use Redis Cluster for HA

---

### 2. Redis Streams Adapter
```typescript
import { createAdapter } from '@socket.io/redis-streams-adapter';

io.adapter(createAdapter(redisClient));
```

**Pros:**
- Better durability (persistent)
- Consumer groups
- Message replay

---

### 3. Kubernetes StatefulSet
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: socket-server
spec:
  replicas: 3
  serviceName: socket-server
  selector:
    matchLabels:
      app: socket-server
```

---

## Sticky Sessions

### Load Balancer Configuration
```nginx
# nginx.conf
upstream socket_backend {
    ip_hash;  # or use cookie-based
    server socket-1:3000;
    server socket-2:3000;
    server socket-3:3000;
}
```

### Why Needed?
- Socket.IO uses multiple HTTP requests for handshake
- All requests must go to same server
- After WebSocket upgrade, connection is persistent

---

## Connection Registry

```typescript
// Track which server hosts which user
class ConnectionRegistry {
  // Redis structure
  // Hash: conn:{userId} -> { socketId, serverId, connectedAt }
  
  async register(userId: string, socketId: string) {
    await redis.hset(`conn:${userId}`, {
      socketId,
      serverId: SERVER_ID,
      connectedAt: Date.now()
    });
  }
  
  async findUser(userId: string) {
    return redis.hgetall(`conn:${userId}`);
  }
}
```

---

## Benchmarks

| Connections | Servers | Messages/sec | Latency (p99) |
|-------------|---------|--------------|---------------|
| 10,000 | 1 | 50,000 | 15ms |
| 50,000 | 3 | 150,000 | 25ms |
| 100,000 | 5 | 300,000 | 40ms |
| 500,000 | 20 | 1,000,000 | 80ms |

---

## Related Documents
- [Socket Cluster Architecture](../flowdiagram/socket-cluster-architecture.md)
- [Socket Service Roadmap](../roadmaps/5_sockets.md)
