# Socket Service - Message Routing Architecture

> **Parent Roadmap**: [Socket Service](../../roadmaps/5_sockets.md)

---

## Overview

Distributed message routing system ensuring reliable, low-latency message delivery across multiple socket servers.

---

## Tasks

### 1. Routing Architecture

#### 1.1 Message Flow Design
```
[Sender Client]
      │
      ▼
[Socket Server A] ──→ [Redis Pub/Sub] ──→ [Socket Server B]
      │                                            │
      │                                            ▼
      │                                   [Recipient Client]
      │
      ▼
[Kafka Producer]
      │
      ▼
[Message Processor] ──→ [MongoDB]
```
- [ ] Single-server message routing
- [ ] Multi-server message routing
- [ ] Kafka integration for persistence
- [ ] Dead letter handling

#### 1.2 Target Resolution
```typescript
// Resolve user to socket connections
interface ConnectionRegistry {
  // Get all socket IDs for a user
  getUserConnections(userId: string): Promise<SocketConnection[]>;
  
  // Get connections in a conversation
  getConversationConnections(conversationId: string): Promise<SocketConnection[]>;
  
  // Get server hosting a socket
  getServerForSocket(socketId: string): Promise<string>;
}

interface SocketConnection {
  socketId: string;
  serverId: string;
  userId: string;
  deviceId: string;
  connectedAt: Date;
}
```
- [ ] User-to-socket mapping (Redis)
- [ ] Socket-to-server mapping
- [ ] Conversation membership cache
- [ ] Connection registry service

### 2. Redis Pub/Sub Implementation

#### 2.1 Channel Design
```
Channel Structure:
├── user:{userId}           # Direct to user (all devices)
├── user:{userId}:{deviceId} # Direct to specific device
├── room:{roomId}           # Room broadcasts
├── tenant:{tenantId}       # Tenant-wide broadcasts
└── server:{serverId}       # Server-specific messages
```
- [ ] Channel naming convention
- [ ] Channel subscription management
- [ ] Message serialization
- [ ] Channel cleanup

#### 2.2 Pub/Sub Manager
```typescript
class PubSubManager {
  private subscriber: Redis;
  private publisher: Redis;
  
  async subscribeToUser(userId: string, handler: MessageHandler): Promise<void> {
    const channel = `user:${userId}`;
    await this.subscriber.subscribe(channel);
    this.handlers.set(channel, handler);
  }
  
  async publishToUser(userId: string, message: SocketMessage): Promise<void> {
    const channel = `user:${userId}`;
    await this.publisher.publish(channel, JSON.stringify(message));
  }
  
  async publishToRoom(roomId: string, message: SocketMessage): Promise<void> {
    const members = await this.getRoomMembers(roomId);
    const pipeline = this.publisher.pipeline();
    
    for (const userId of members) {
      pipeline.publish(`user:${userId}`, JSON.stringify(message));
    }
    
    await pipeline.exec();
  }
}
```
- [ ] Separate subscriber/publisher connections
- [ ] Message handler registration
- [ ] Batch publishing
- [ ] Error handling and retry

### 3. Message Routing Logic

#### 3.1 Route Determination
```typescript
async function routeMessage(message: OutgoingMessage): Promise<RoutingResult> {
  const routing: RoutingResult = {
    local: [],
    remote: new Map<string, string[]>()  // serverId → socketIds
  };
  
  // Get target users based on message type
  const targetUsers = await getTargetUsers(message);
  
  for (const userId of targetUsers) {
    const connections = await registry.getUserConnections(userId);
    
    for (const conn of connections) {
      if (conn.serverId === currentServerId) {
        routing.local.push(conn.socketId);
      } else {
        if (!routing.remote.has(conn.serverId)) {
          routing.remote.set(conn.serverId, []);
        }
        routing.remote.get(conn.serverId)!.push(conn.socketId);
      }
    }
  }
  
  return routing;
}
```
- [ ] Get target users for message type
- [ ] Classify as local or remote
- [ ] Batch by target server
- [ ] Handle no-recipients scenario

#### 3.2 Message Delivery
```typescript
async function deliverMessage(message: SocketMessage, routing: RoutingResult): Promise<DeliveryResult> {
  const results: DeliveryResult = {
    delivered: [],
    failed: []
  };
  
  // Deliver to local sockets
  for (const socketId of routing.local) {
    try {
      io.to(socketId).emit(message.type, message.payload);
      results.delivered.push(socketId);
    } catch (error) {
      results.failed.push({ socketId, error: error.message });
    }
  }
  
  // Publish to remote servers via Redis
  for (const [serverId, socketIds] of routing.remote) {
    await pubsub.publish(`server:${serverId}`, {
      type: 'deliver',
      socketIds,
      message
    });
  }
  
  return results;
}
```
- [ ] Local socket delivery
- [ ] Remote server publishing
- [ ] Delivery confirmation
- [ ] Failed delivery handling

### 4. Message Types & Handlers

#### 4.1 Message Type Registry
```typescript
// Message type definitions
const messageTypes = {
  // Chat messages
  'message:send': {
    handler: handleMessageSend,
    requiresAck: true,
    persist: true,
    route: 'conversation'
  },
  
  // Typing indicators
  'typing:start': {
    handler: handleTypingStart,
    requiresAck: false,
    persist: false,
    route: 'conversation',
    throttle: 3000
  },
  
  // Presence
  'presence:update': {
    handler: handlePresenceUpdate,
    requiresAck: false,
    persist: false,
    route: 'subscribers'
  },
  
  // Read receipts
  'message:read': {
    handler: handleMessageRead,
    requiresAck: true,
    persist: true,
    route: 'sender'
  }
};
```
- [ ] Message type definitions
- [ ] Handler mapping
- [ ] Routing rules per type
- [ ] Persistence requirements

#### 4.2 Handler Implementation
```typescript
async function handleMessageSend(
  socket: Socket,
  payload: MessagePayload
): Promise<void> {
  const { conversationId, content, type } = payload;
  
  // Validate
  await validateMessageAccess(socket.userId, conversationId);
  
  // Create message object
  const message: Message = {
    id: generateMessageId(),
    conversationId,
    senderId: socket.userId,
    content,
    type,
    createdAt: new Date(),
    status: 'sending'
  };
  
  // Route to conversation participants
  const participants = await getConversationParticipants(conversationId);
  
  await routeMessage({
    type: 'message:new',
    payload: message,
    targets: participants.filter(p => p !== socket.userId)
  });
  
  // Queue for persistence
  await kafkaProducer.send({
    topic: `messages.${socket.tenantId}`,
    messages: [{ value: JSON.stringify(message) }]
  });
  
  // Acknowledge to sender
  socket.emit('message:sent', { id: message.id, status: 'sent' });
}
```
- [ ] Message validation
- [ ] Authorization check
- [ ] Message routing
- [ ] Persistence queuing
- [ ] Sender acknowledgment

### 5. Delivery Guarantees

#### 5.1 Acknowledgment System
```typescript
// Client-side acknowledgment
socket.on('message:new', (message, ack) => {
  try {
    displayMessage(message);
    ack({ received: true });
  } catch (error) {
    ack({ received: false, error: error.message });
  }
});

// Server-side tracking
class AckTracker {
  private pending = new Map<string, PendingAck>();
  
  async waitForAck(messageId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(messageId);
        resolve(false);
      }, timeout);
      
      this.pending.set(messageId, { timer, resolve });
    });
  }
  
  receiveAck(messageId: string): void {
    const pending = this.pending.get(messageId);
    if (pending) {
      clearTimeout(pending.timer);
      pending.resolve(true);
      this.pending.delete(messageId);
    }
  }
}
```
- [ ] Ack request/response protocol
- [ ] Timeout handling
- [ ] Retry on no ack
- [ ] Max retry limits

#### 5.2 Offline Message Queue
```typescript
// Queue messages for offline users
async function queueOfflineMessage(
  userId: string,
  message: SocketMessage
): Promise<void> {
  await redis.rpush(
    `offline:${userId}`,
    JSON.stringify({
      ...message,
      queuedAt: Date.now()
    })
  );
  
  // Set expiration (7 days)
  await redis.expire(`offline:${userId}`, 7 * 24 * 60 * 60);
}

// Deliver queued messages on reconnect
async function deliverOfflineMessages(socket: Socket): Promise<void> {
  const messages = await redis.lrange(`offline:${socket.userId}`, 0, -1);
  
  for (const msgStr of messages) {
    const message = JSON.parse(msgStr);
    socket.emit(message.type, message.payload);
  }
  
  await redis.del(`offline:${socket.userId}`);
}
```
- [ ] Message queuing for offline
- [ ] Queue expiration
- [ ] Delivery on reconnect
- [ ] Order preservation

### 6. Performance Optimization

#### 6.1 Message Batching
- [ ] Batch multiple messages
- [ ] Batch interval configuration
- [ ] Force flush on threshold
- [ ] Unbatching on receive

#### 6.2 Compression
- [ ] Message payload compression
- [ ] Binary message support
- [ ] Compression level configuration

---

## Metrics

| Metric | SLO |
|--------|-----|
| Message Delivery Latency (p99) | < 100ms |
| Delivery Success Rate | > 99.9% |
| Offline Queue Size | < 10MB/user |
| Ack Wait Time | < 5 seconds |

---

## Related Documents

- [Socket Cluster Architecture](../../flowdiagram/socket-cluster-architecture.md)
- [Socket.IO Horizontal Scaling](../../rnd/socketio-scaling.md)
