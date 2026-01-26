# Phase 4: Core Messaging

## Overview

Phase 4 implements the core messaging features including conversations, messages, media handling, and message actions.

## Dependencies

- Phase 1: Infrastructure (MongoDB, Kafka, Gateway)
- Phase 2: Security (Authentication, Authorization, Encryption)
- Phase 3: Real-Time (Socket.IO, Presence)

## Feature Areas

### 1. Conversations (`conversations/`)
Conversation management including 1:1 and group conversations.

- **01-conversation-crud.json** - Create, read, update, delete conversations
- **02-group-conversations.json** - Group chat features
- **03-conversation-settings.json** - Settings, muting, archiving

### 2. Messages (`messages/`)
Message sending, receiving, and management.

- **01-message-crud.json** - Create, read, update, delete messages
- **02-message-types.json** - Text, media, system messages
- **03-message-actions.json** - Reactions, replies, forwards

### 3. Media (`media/`)
Media upload, storage, and delivery.

- **01-media-upload.json** - File upload, validation
- **02-media-processing.json** - Image/video processing
- **03-media-delivery.json** - CDN, signed URLs

### 4. Search (`search/`)
Message and conversation search.

- **01-full-text-search.json** - Message content search
- **02-conversation-search.json** - Conversation search

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                         (Fastify)                                │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Conversation   │ │    Message      │ │     Media       │
│    Service      │ │    Service      │ │    Service      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    MongoDB      │ │     Kafka       │ │   Object Store  │
│   (Messages)    │ │   (Events)      │ │    (Media)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Task Summary

| Feature Area | JSON Files | Total Tasks |
|--------------|------------|-------------|
| Conversations | 3 | 12 |
| Messages | 3 | 12 |
| Media | 3 | 12 |
| Search | 2 | 6 |
| **Total** | **11** | **42** |

## Message Types

- **text**: Plain text message
- **image**: Image with thumbnail
- **video**: Video with thumbnail
- **audio**: Audio message/voice note
- **file**: Generic file attachment
- **location**: Location sharing
- **contact**: Contact card
- **system**: System message (user joined, etc.)

## Getting Started

```bash
cd tasks/phases/phase-4-messaging

# Start with conversation CRUD
# Then message CRUD
# Add media handling
# Finally implement search

# Dependencies from previous phases must be running
```
