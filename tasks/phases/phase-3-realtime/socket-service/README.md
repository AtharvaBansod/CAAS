# Socket Service

## Overview

Core Socket.IO server implementation with clustering support, authentication integration, and room management for real-time communication.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| 01-core-setup.json | 4 | SOCKET-001 to SOCKET-004: Docker, Socket.IO server, clustering, Redis adapter |
| 02-authentication.json | 4 | SOCKET-005 to SOCKET-008: Socket auth, JWT validation, session binding |
| 03-room-management.json | 4 | SOCKET-009 to SOCKET-012: Room management, broadcasts, tenant isolation |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client SDK                                │
│                     (Socket.IO Client)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                         WebSocket / Polling
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Load Balancer                                │
│               (Sticky Sessions: socket.io)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Socket Node 1 │     │ Socket Node 2 │     │ Socket Node 3 │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │Socket.IO  │ │     │ │Socket.IO  │ │     │ │Socket.IO  │ │
│ │Server     │ │     │ │Server     │ │     │ │Server     │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │Redis      │ │     │ │Redis      │ │     │ │Redis      │ │
│ │Adapter    │ │     │ │Adapter    │ │     │ │Adapter    │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │      Redis        │
                    │   (Pub/Sub +      │
                    │    Sessions)      │
                    └───────────────────┘
```

## Key Features

1. **Horizontal Scaling**: Multiple Socket.IO nodes with Redis adapter
2. **Authentication**: JWT-based authentication on connection
3. **Room Management**: Tenant-isolated room handling
4. **Event Broadcasting**: Efficient message delivery to room members
5. **Connection State**: Track connected users and sessions

## Dependencies

- Phase 1: MongoDB, Redis, Kafka infrastructure
- Phase 2: JWT authentication, session management

## Environment Variables

```env
SOCKET_PORT=3001
REDIS_URL=redis://localhost:6379
SOCKET_CORS_ORIGIN=*
SOCKET_PATH=/socket.io
SOCKET_PING_INTERVAL=25000
SOCKET_PING_TIMEOUT=20000
```

## Getting Started

1. Complete Phase 1 infrastructure setup
2. Complete Phase 2 authentication setup
3. Start with SOCKET-001 Docker configuration
4. Progress through tasks sequentially
