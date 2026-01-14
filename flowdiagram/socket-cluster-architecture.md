# Flow Diagram: Socket Cluster Architecture

> **Related Roadmaps**: 
> - [Socket Service](../roadmaps/5_sockets.md)
> - [Kafka Service](../roadmaps/8_kafkaService.md)

---

## Overview

High-level architecture of the distributed Socket.IO cluster with Redis Pub/Sub and Kafka integration.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                                  │                                          │
│                          ┌───────▼───────┐                                  │
│                          │   CDN / WAF   │                                  │
│                          │  (CloudFlare) │                                  │
│                          └───────┬───────┘                                  │
│                                  │                                          │
│                          ┌───────▼───────┐                                  │
│                          │ Load Balancer │                                  │
│                          │  (Nginx/AWS)  │                                  │
│                          │ Sticky Session│                                  │
│                          └───────┬───────┘                                  │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                 │
│         │                        │                        │                 │
│   ┌─────▼─────┐           ┌─────▼─────┐           ┌─────▼─────┐            │
│   │  Socket   │           │  Socket   │           │  Socket   │            │
│   │ Server 1  │           │ Server 2  │           │ Server 3  │            │
│   │ (pod-1)   │           │ (pod-2)   │           │ (pod-3)   │            │
│   └─────┬─────┘           └─────┬─────┘           └─────┬─────┘            │
│         │                       │                       │                   │
│         └───────────────────────┼───────────────────────┘                   │
│                                 │                                           │
│                         ┌───────▼───────┐                                   │
│                         │ Redis Cluster │                                   │
│                         │   (Pub/Sub)   │                                   │
│                         └───────┬───────┘                                   │
│                                 │                                           │
│                         ┌───────▼───────┐                                   │
│                         │ Kafka Cluster │                                   │
│                         │ (Persistence) │                                   │
│                         └───────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Connection Flow

```mermaid
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant Server1 as Socket Server 1
    participant Server2 as Socket Server 2
    participant Redis
    participant Auth

    Note over Client,Auth: Client Connection Establishment

    Client->>LB: WebSocket Upgrade Request<br/>Auth: Bearer token
    LB->>LB: Hash client ID for stickiness
    LB->>Server1: Forward to assigned server
    
    Server1->>Auth: Validate JWT token
    Auth-->>Server1: {userId, tenantId, permissions}
    
    Server1->>Redis: HSET connections:server1 {socketId}: {userId}
    Server1->>Redis: SADD user:{userId}:sockets {socketId}
    
    Server1-->>Client: Connection established
    
    Note over Client,Auth: Join conversation rooms
    
    Client->>Server1: join_room(conversationId)
    Server1->>Redis: SADD room:{convId} {socketId}
    Server1-->>Client: room_joined
```

---

## 3. Cross-Server Message Routing

```mermaid
sequenceDiagram
    participant Alice as Alice (Server 1)
    participant S1 as Socket Server 1
    participant Redis
    participant S2 as Socket Server 2
    participant Bob as Bob (Server 2)
    participant Kafka

    Note over Alice,Kafka: Message sent to user on different server

    Alice->>S1: message:send {to: Bob, content: "Hello"}
    
    S1->>Redis: GET user:bob:sockets
    Redis-->>S1: [{socketId: "xyz", server: "server2"}]
    
    S1->>Redis: PUBLISH server:server2 {type: "deliver", socketId: "xyz", message: {...}}
    
    Redis->>S2: Message subscription
    S2->>Bob: emit("message:new", {...})
    
    S1->>Kafka: Produce to messages.tenant_id
    
    S2-->>Redis: ACK received
    S1->>Alice: message:sent {id, status: "delivered"}
```

---

## 4. Room Broadcast Pattern

```mermaid
flowchart TD
    subgraph Server1["Socket Server 1"]
        S1C1[Client A]
        S1C2[Client B]
    end

    subgraph Server2["Socket Server 2"]
        S2C1[Client C]
        S2C2[Client D]
    end

    subgraph Server3["Socket Server 3"]
        S3C1[Client E]
    end

    subgraph Redis["Redis Pub/Sub"]
        Channel[room:conversation-123]
    end

    Sender[Sender Client A] -->|Broadcast to room| S1
    S1 --> Channel
    Channel -->|Subscribe| S1
    Channel -->|Subscribe| S2
    Channel -->|Subscribe| S3

    S1 --> S1C2
    S2 --> S2C1
    S2 --> S2C2
    S3 --> S3C1

    style Sender fill:#90EE90
    style Channel fill:#FFE4B5
```

---

## 5. Presence Distribution

```mermaid
flowchart LR
    subgraph UserA["User A goes online"]
        A1[Connect to Server 1]
    end

    subgraph PresenceUpdate["Presence Propagation"]
        P1[Update Redis presence]
        P2[Publish to presence channel]
    end

    subgraph Subscribers["Presence Subscribers"]
        S1[User B - Server 1]
        S2[User C - Server 2]
        S3[User D - Server 3]
    end

    A1 --> P1
    P1 --> P2
    P2 --> S1
    P2 --> S2
    P2 --> S3

    style P2 fill:#FFE4B5
```

```
PRESENCE DATA FLOW:

1. User connects
   └─▶ SET presence:{userId} {status: "online", lastSeen: timestamp}
   
2. Notify subscribers
   └─▶ PUBLISH presence:updates {userId, status: "online"}
   
3. Each server with subscribers
   └─▶ Emit to local sockets subscribed to user's presence
   
4. Heartbeat (every 30s)
   └─▶ EXPIRE presence:{userId} 60
   
5. User disconnects
   └─▶ SET presence:{userId} {status: "offline", lastSeen: now}
   └─▶ PUBLISH presence:updates {userId, status: "offline"}
```

---

## 6. Scaling Events

```mermaid
flowchart TD
    subgraph ScaleUp["Scale Up Event"]
        N1[HPA detects high CPU]
        N2[Launch new pod: server-4]
        N3[Server-4 connects to Redis]
        N4[Subscribes to channels]
        N5[Ready for connections]
    end

    subgraph ScaleDown["Scale Down Event"]
        D1[HPA signals scale down]
        D2[Mark server as draining]
        D3[Stop accepting new connections]
        D4[Wait for graceful disconnect]
        D5[Move persistent rooms if needed]
        D6[Terminate pod]
    end

    N1 --> N2 --> N3 --> N4 --> N5
    D1 --> D2 --> D3 --> D4 --> D5 --> D6

    style N1 fill:#90EE90
    style D1 fill:#FFB6C1
```

---

## 7. Failure Handling

```mermaid
flowchart TD
    subgraph Detection["Failure Detection"]
        F1[Server 2 crashes]
        F2[Redis detects missing heartbeat]
        F3[Load balancer health check fails]
    end

    subgraph Recovery["Recovery Process"]
        R1[LB removes Server 2 from pool]
        R2[Clients auto-reconnect]
        R3[LB routes to healthy servers]
        R4[Sessions restored from Redis]
    end

    subgraph ClientSide["Client Recovery"]
        C1[Connection lost detected]
        C2[Socket.IO auto-reconnect]
        C3[Exponential backoff]
        C4[Reconnected to Server 1/3]
        C5[Rejoin rooms & resume]
    end

    F1 --> F2 --> F3
    F3 --> R1 --> R2 --> R3 --> R4
    F1 --> C1 --> C2 --> C3 --> C4 --> C5

    style F1 fill:#FFB6C1
    style C5 fill:#90EE90
```

---

## 8. Data Stores Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           DATA STORE RESPONSIBILITIES                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         REDIS CLUSTER                                 │  │
│  │                                                                       │  │
│  │  Purpose: Real-time state & Pub/Sub                                  │  │
│  │                                                                       │  │
│  │  ├── connections:{serverId}     → socketId:userId mapping           │  │
│  │  ├── user:{userId}:sockets      → All sockets for a user            │  │
│  │  ├── room:{roomId}              → All sockets in a room             │  │
│  │  ├── presence:{userId}          → Online status                      │  │
│  │  ├── typing:{conversationId}    → Currently typing users            │  │
│  │  └── offline:{userId}           → Queued offline messages           │  │
│  │                                                                       │  │
│  │  Pub/Sub Channels:                                                   │  │
│  │  ├── server:{serverId}          → Server-specific messages          │  │
│  │  ├── room:{roomId}              → Room broadcasts                   │  │
│  │  └── presence:updates           → Presence change notifications     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         KAFKA CLUSTER                                 │  │
│  │                                                                       │  │
│  │  Purpose: Durable message persistence & event streaming              │  │
│  │                                                                       │  │
│  │  Topics:                                                              │  │
│  │  ├── messages.{tenant_id}       → Chat messages for persistence     │  │
│  │  ├── events.socket              → Socket events for analytics       │  │
│  │  ├── presence.changes           → Presence for history              │  │
│  │  └── notifications              → Push notification triggers        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                           MONGODB                                     │  │
│  │                                                                       │  │
│  │  Purpose: Persistent storage (consumed from Kafka)                   │  │
│  │                                                                       │  │
│  │  Collections:                                                         │  │
│  │  ├── messages                   → All chat messages                  │  │
│  │  ├── conversations              → Conversation metadata              │  │
│  │  └── users                      → User profiles & keys               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Socket Service Roadmap](../roadmaps/5_sockets.md)
- [Message Routing Deep Dive](../deepDive/sockets/message-routing.md)
- [WebSocket vs Socket.IO R&D](../rnd/websocket-vs-socketio.md)
