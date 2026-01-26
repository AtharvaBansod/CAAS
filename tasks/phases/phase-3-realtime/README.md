# Phase 3: Real-Time Communication

## Overview

Phase 3 implements the real-time communication layer using Socket.IO for bi-directional communication, presence management, typing indicators, and WebRTC signaling support.

## Dependencies

- Phase 1: Infrastructure (MongoDB, Kafka, Gateway)
- Phase 2: Security (Authentication, Authorization)

## Feature Areas

### 1. Socket Service (`socket-service/`)
Core Socket.IO server with clustering and authentication.

- **01-core-setup.json** - Socket.IO server, clustering, Docker setup
- **02-authentication.json** - Socket authentication, session binding
- **03-room-management.json** - Room joins, leaves, broadcasts

### 2. Presence System (`presence/`)
Real-time user presence tracking and status management.

- **01-presence-tracking.json** - Online/offline detection, status management
- **02-presence-sync.json** - Cross-node presence synchronization

### 3. Real-Time Events (`realtime-events/`)
Typing indicators, read receipts, and live notifications.

- **01-typing-indicators.json** - Typing start/stop events
- **02-read-receipts.json** - Message read tracking
- **03-notifications.json** - Push notifications integration

### 4. WebRTC Signaling (`webrtc/`)
Signaling server for audio/video calls.

- **01-signaling-server.json** - WebRTC signaling, ICE candidates
- **02-call-management.json** - Call initiation, termination, group calls

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Load Balancer                               │
│                   (Sticky Sessions)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Socket Node 1  │ │  Socket Node 2  │ │  Socket Node 3  │
│   Socket.IO     │ │   Socket.IO     │ │   Socket.IO     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Redis Adapter    │
                    │  (Pub/Sub)        │
                    └───────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Presence      │ │     Kafka       │ │    MongoDB      │
│   (Redis)       │ │   (Events)      │ │   (Storage)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Task Summary

| Feature Area | JSON Files | Total Tasks |
|--------------|------------|-------------|
| Socket Service | 3 | 12 |
| Presence | 2 | 8 |
| Real-Time Events | 3 | 12 |
| WebRTC | 2 | 8 |
| **Total** | **10** | **40** |

## Key Technologies

- **Socket.IO 4.x**: WebSocket library with fallbacks
- **Redis Adapter**: Cross-node message broadcasting
- **Redis**: Presence storage and pub/sub
- **Kafka**: Event persistence and streaming
- **WebRTC**: Peer-to-peer media communication

## Socket Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `join_room` - Join a conversation room
- `leave_room` - Leave a conversation room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `message_read` - Mark message as read
- `presence_update` - Update user status
- `call_initiate` - Start a call
- `call_answer` - Answer a call
- `call_end` - End a call

### Server → Client
- `authenticated` - Authentication success
- `message_new` - New message received
- `message_updated` - Message updated
- `message_deleted` - Message deleted
- `user_typing` - User is typing
- `user_presence` - User presence changed
- `call_incoming` - Incoming call
- `call_ended` - Call ended
- `notification` - Push notification

## Getting Started

```bash
cd tasks/phases/phase-3-realtime

# Start with socket service core setup
# Then add authentication
# Then add room management
# Move to presence, events, and WebRTC

# Dependencies from previous phases must be running:
# - MongoDB replica set
# - Redis
# - Kafka
# - Gateway with auth middleware
```

## Scalability Notes

- Socket.IO with Redis adapter for horizontal scaling
- Sticky sessions required at load balancer
- Presence state stored in Redis for fast access
- Events persisted to Kafka for reliability
- WebRTC uses TURN/STUN for NAT traversal
