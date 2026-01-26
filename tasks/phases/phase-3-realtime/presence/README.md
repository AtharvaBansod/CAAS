# Presence System

## Overview

Real-time user presence tracking and status management with cross-node synchronization for accurate online/offline detection.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| 01-presence-tracking.json | 4 | PRESENCE-001 to PRESENCE-004: Online/offline detection, status management |
| 02-presence-sync.json | 4 | PRESENCE-005 to PRESENCE-008: Cross-node sync, conflict resolution |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Socket Nodes                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Node 1    │  │   Node 2    │  │   Node 3    │             │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │             │
│  │ │Presence │ │  │ │Presence │ │  │ │Presence │ │             │
│  │ │Tracker  │ │  │ │Tracker  │ │  │ │Tracker  │ │             │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                  ┌────────▼────────┐
                  │      Redis      │
                  │ ┌─────────────┐ │
                  │ │  Presence   │ │
                  │ │   Store     │ │
                  │ └─────────────┘ │
                  │ ┌─────────────┐ │
                  │ │   Pub/Sub   │ │
                  │ │  (Updates)  │ │
                  │ └─────────────┘ │
                  └─────────────────┘
```

## Presence States

| State | Description |
|-------|-------------|
| `online` | User is actively connected |
| `away` | User is idle (no activity) |
| `busy` | User has set "Do Not Disturb" |
| `offline` | User is disconnected |
| `invisible` | User is online but hidden |

## Key Features

1. **Real-time Updates**: Instant presence changes
2. **Multi-device Support**: Track presence across devices
3. **Custom Status**: User-defined status messages
4. **Idle Detection**: Automatic away status
5. **Invisible Mode**: Hidden presence option

## Dependencies

- SOCKET-006: Session binding
- SOCKET-007: Connection lifecycle
- Redis for presence storage

## Environment Variables

```env
PRESENCE_IDLE_TIMEOUT_MS=300000
PRESENCE_OFFLINE_DELAY_MS=30000
PRESENCE_SYNC_INTERVAL_MS=5000
```
