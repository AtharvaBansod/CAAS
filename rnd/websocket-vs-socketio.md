# R&D: WebSocket vs Socket.IO Comparison

> **Related Roadmap**: [Socket Service](../roadmaps/5_sockets.md)

---

## Executive Summary

Comparison of raw WebSocket implementation versus Socket.IO for the CAAS real-time communication layer.

---

## 1. Overview Comparison

| Feature | Raw WebSocket | Socket.IO |
|---------|---------------|-----------|
| Protocol | WebSocket only | WS + Polling fallback |
| Browser Support | Modern browsers | Universal (IE9+) |
| Auto-Reconnect | Manual | Built-in |
| Rooms/Namespaces | Manual | Built-in |
| Binary Support | Yes | Yes |
| Message Ack | Manual | Built-in |
| Broadcast | Manual | Built-in |
| Scaling | Manual | Redis adapter |

---

## 2. Raw WebSocket

### 2.1 Implementation

```typescript
// Server (Node.js with ws library)
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Connection management
const clients = new Map<string, WebSocket>();

wss.on('connection', (ws, req) => {
  const userId = authenticateConnection(req);
  clients.set(userId, ws);
  
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    handleMessage(userId, message);
  });
  
  ws.on('close', () => {
    clients.delete(userId);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Manual room broadcast
function broadcastToRoom(roomId: string, message: any) {
  const roomMembers = getRoomMembers(roomId);
  const payload = JSON.stringify(message);
  
  for (const userId of roomMembers) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
```

### 2.2 Pros

- **Lighter weight**: No library overhead
- **Full control**: Custom protocol design
- **Lower latency**: Direct connection
- **Smaller bundle**: ~5KB vs ~30KB

### 2.3 Cons

- **No fallback**: Fails without WS support
- **Manual reconnection**: Must implement yourself
- **No rooms/namespaces**: Build from scratch
- **More code**: Higher development cost

---

## 3. Socket.IO

### 3.1 Implementation

```typescript
// Server
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const io = new Server(httpServer, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Redis adapter for scaling
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.data.user = verifyToken(token);
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.user.id;
  
  // Join user's personal room
  socket.join(`user:${userId}`);
  
  // Message handling with acknowledgment
  socket.on('message:send', async (data, callback) => {
    try {
      const result = await handleMessage(data);
      callback({ status: 'ok', id: result.id });
    } catch (error) {
      callback({ status: 'error', message: error.message });
    }
  });
  
  // Room operations
  socket.on('room:join', (roomId) => {
    socket.join(`room:${roomId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
  });
});

// Broadcasting
io.to('room:123').emit('message:new', { content: 'Hello' });
```

### 3.2 Pros

- **Fallback transports**: Works everywhere
- **Auto-reconnection**: Handles drops gracefully
- **Rooms & namespaces**: Built-in organization
- **Redis adapter**: Easy horizontal scaling
- **Acknowledgments**: Built-in request-response
- **Binary support**: Efficient file transfer

### 3.3 Cons

- **Larger bundle**: ~30KB client library
- **Slight overhead**: Protocol wrapping
- **Vendor lock-in**: Socket.IO specific
- **Complexity**: More than needed for simple use

---

## 4. Scaling Comparison

### 4.1 Raw WebSocket Scaling

```typescript
// Manual scaling with Redis Pub/Sub
import Redis from 'ioredis';

const pub = new Redis();
const sub = new Redis();

// Subscribe to messages for this server
sub.subscribe('broadcast', 'room-*');
sub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  
  if (channel === 'broadcast') {
    // Broadcast to all local clients
    broadcastToAll(data);
  } else if (channel.startsWith('room-')) {
    const roomId = channel.slice(5);
    broadcastToRoom(roomId, data);
  }
});

// Send to all servers
function scaledBroadcast(message: any) {
  pub.publish('broadcast', JSON.stringify(message));
}

function scaledRoomBroadcast(roomId: string, message: any) {
  pub.publish(`room-${roomId}`, JSON.stringify(message));
}
```

### 4.2 Socket.IO Scaling

```typescript
// Socket.IO with Redis adapter - just works
import { createAdapter } from '@socket.io/redis-adapter';

io.adapter(createAdapter(pubClient, subClient));

// Room broadcasts automatically work across servers
io.to('room:123').emit('message', data);
```

---

## 5. Feature Implementation Comparison

| Feature | Raw WS (LOC) | Socket.IO (LOC) |
|---------|--------------|-----------------|
| Basic server | 50 | 20 |
| Authentication | 30 | 15 |
| Rooms | 100 | 5 |
| Reconnection | 80 | 0 (built-in) |
| Multi-server | 150 | 10 |
| Binary transfer | 40 | 5 |
| Acknowledgments | 60 | 5 |
| **Total** | **~510** | **~60** |

---

## 6. Performance Benchmarks

### 6.1 Latency (local network)

| Metric | Raw WS | Socket.IO |
|--------|--------|-----------|
| Connection time | 2ms | 5ms |
| Message latency | 0.5ms | 1ms |
| Reconnection | N/A | 1.5s avg |

### 6.2 Throughput

| Metric | Raw WS | Socket.IO |
|--------|--------|-----------|
| Messages/sec (single) | 150,000 | 100,000 |
| Connections per server | 1,000,000+ | 100,000+ |

### 6.3 Memory Usage

| Connections | Raw WS | Socket.IO |
|-------------|--------|-----------|
| 10,000 | 50MB | 150MB |
| 100,000 | 400MB | 1.2GB |

---

## 7. Recommendation for CAAS

### Decision: **Socket.IO**

**Rationale**:

1. **Feature completeness**: Rooms, namespaces, acknowledgments are essential for chat
2. **Scaling**: Redis adapter provides seamless horizontal scaling
3. **Reliability**: Auto-reconnection critical for mobile users
4. **Time-to-market**: Significantly less code to write
5. **Fallback**: Polling fallback for restrictive networks

### Optimization Strategies

```typescript
// Reduce overhead
const io = new Server({
  // Disable unnecessary features
  serveClient: false,
  
  // Prefer WebSocket
  transports: ['websocket', 'polling'],
  
  // Optimize for throughput
  perMessageDeflate: {
    threshold: 1024  // Only compress larger messages
  }
});

// Binary for large payloads
socket.emit('file', buffer);  // Uses binary frames

// Batch messages when possible
const batch = [];
socket.on('message', (msg) => {
  batch.push(msg);
});
setInterval(() => {
  if (batch.length > 0) {
    processBatch(batch.splice(0));
  }
}, 50);
```

### Hybrid Approach (Future)

For ultra-low-latency features (typing indicators, cursor sync):
- Use raw WebSocket alongside Socket.IO
- Dedicated WS connection for high-frequency updates
- Socket.IO for reliability-critical messages

---

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [WS Library](https://github.com/websockets/ws)
- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
