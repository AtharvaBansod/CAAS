# Real-Time Events

## Overview

Real-time event handling for typing indicators, read receipts, and push notifications.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| 01-typing-indicators.json | 4 | TYPING-001 to TYPING-004: Typing start/stop events |
| 02-read-receipts.json | 4 | RECEIPT-001 to RECEIPT-004: Message read tracking |
| 03-notifications.json | 4 | NOTIFY-001 to NOTIFY-004: Push notifications |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Typing Events│  │ Read Events  │  │Push Subscribe│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Socket Service                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Typing     │  │    Read      │  │   Notify     │          │
│  │   Handler    │  │   Handler    │  │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Kafka                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │typing.events │  │read.receipts │  │notifications │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Event Types

### Typing Indicators
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `user_typing` - Broadcast to room members

### Read Receipts
- `message_read` - Mark message as read
- `messages_read` - Batch mark as read
- `read_receipt` - Broadcast read confirmation

### Notifications
- `notification_new` - New notification
- `notification_read` - Mark notification read
- `push_subscribe` - Subscribe to push

## Dependencies

- SOCKET-009: Room management
- SOCKET-010: Broadcasting
- KAFKA-008: Producer patterns

## Environment Variables

```env
TYPING_TIMEOUT_MS=3000
READ_RECEIPT_BATCH_SIZE=100
PUSH_NOTIFICATION_ENABLED=true
FCM_API_KEY=xxx
APNS_KEY_FILE=/path/to/key.p8
```
