# Socket Service - Performance Tuning

> **Parent Roadmap**: [Socket Service](../../roadmaps/5_sockets.md)

---

## Overview

Optimization strategies for high-performance WebSocket server.

---

## 1. Connection Limits

```typescript
// Server configuration
const io = new Server(httpServer, {
  // Connection settings
  maxHttpBufferSize: 1e6,        // 1MB max message size
  pingTimeout: 60000,            // 60s ping timeout
  pingInterval: 25000,           // 25s ping interval
  upgradeTimeout: 10000,         // 10s upgrade timeout
  
  // Transport settings
  transports: ['websocket'],     // Skip polling, WebSocket only
  allowUpgrades: false,
  
  // Compression
  perMessageDeflate: {
    threshold: 1024              // Compress messages > 1KB
  },
  
  // Connection throttling
  connectTimeout: 45000
});

// Per-namespace connection limits
io.use((socket, next) => {
  const count = io.of('/').sockets.size;
  if (count >= MAX_CONNECTIONS) {
    return next(new Error('Server at capacity'));
  }
  next();
});
```

---

## 2. Memory Optimization

```typescript
// Limit room size in memory
class RoomManager {
  private static MAX_ROOMS_PER_USER = 50;
  
  async joinRoom(socket: Socket, roomId: string): Promise<void> {
    const userRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    
    if (userRooms.length >= RoomManager.MAX_ROOMS_PER_USER) {
      // Leave oldest room
      const oldestRoom = userRooms[0];
      await socket.leave(oldestRoom);
    }
    
    await socket.join(roomId);
  }
}

// Periodic cleanup of stale data
setInterval(async () => {
  // Clean disconnected socket references
  const sockets = await io.fetchSockets();
  const activeIds = new Set(sockets.map(s => s.id));
  
  // Clean up presence data for disconnected sockets
  await cleanupPresence(activeIds);
}, 60000);
```

---

## 3. Message Batching

```typescript
class MessageBatcher {
  private buffers = new Map<string, Message[]>();
  private flushInterval = 50; // ms
  
  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  add(userId: string, message: Message): void {
    if (!this.buffers.has(userId)) {
      this.buffers.set(userId, []);
    }
    this.buffers.get(userId)!.push(message);
  }
  
  private flush(): void {
    for (const [userId, messages] of this.buffers) {
      if (messages.length > 0) {
        // Send all messages in single emit
        io.to(`user:${userId}`).emit('messages:batch', messages);
        this.buffers.set(userId, []);
      }
    }
  }
}
```

---

## 4. Event Throttling

```typescript
// Throttle frequent events like typing
class EventThrottler {
  private lastEmit = new Map<string, number>();
  
  shouldEmit(key: string, intervalMs: number): boolean {
    const now = Date.now();
    const last = this.lastEmit.get(key) || 0;
    
    if (now - last < intervalMs) {
      return false;
    }
    
    this.lastEmit.set(key, now);
    return true;
  }
}

const throttler = new EventThrottler();

socket.on('typing:start', ({ conversationId }) => {
  const key = `typing:${socket.userId}:${conversationId}`;
  
  if (throttler.shouldEmit(key, 3000)) {  // Max once per 3s
    socket.to(conversationId).emit('typing:update', {
      userId: socket.userId,
      typing: true
    });
  }
});
```

---

## 5. Load Balancing

```typescript
// Sticky session configuration
// nginx.conf
upstream socket_servers {
    ip_hash;  // or use consistent hashing
    
    server socket-1:3000 weight=1 max_conns=10000;
    server socket-2:3000 weight=1 max_conns=10000;
    server socket-3:3000 weight=1 max_conns=10000;
    
    keepalive 32;
}
```

---

## 6. Metrics to Monitor

```typescript
// Key performance metrics
const metrics = {
  // Connection metrics
  connectionsActive: new Gauge('socket_connections_active'),
  connectionsTotal: new Counter('socket_connections_total'),
  
  // Message metrics
  messagesSent: new Counter('socket_messages_sent_total'),
  messagesReceived: new Counter('socket_messages_received_total'),
  messageLatency: new Histogram('socket_message_latency_ms'),
  
  // Room metrics
  roomsActive: new Gauge('socket_rooms_active'),
  roomSize: new Histogram('socket_room_size'),
  
  // Memory metrics
  heapUsed: new Gauge('socket_heap_used_bytes'),
  eventLoopLag: new Gauge('socket_event_loop_lag_ms')
};

// Track event loop lag
const start = process.hrtime();
setImmediate(() => {
  const [s, ns] = process.hrtime(start);
  const lagMs = s * 1000 + ns / 1e6;
  metrics.eventLoopLag.set(lagMs);
});
```

---

## 7. Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Connection Time | < 100ms | > 500ms |
| Message Latency (p99) | < 50ms | > 200ms |
| Memory per Connection | < 50KB | > 100KB |
| Event Loop Lag | < 10ms | > 50ms |
| CPU Usage | < 70% | > 85% |

---

## Related Documents
- [Connection Management](./connection-management.md)
- [Protocol Design](./protocol-design.md)
