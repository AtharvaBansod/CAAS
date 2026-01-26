# Messages Feature

## Overview
Message handling including CRUD operations, different message types, and message actions like reactions and replies.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `01-message-crud.json` | MSG-001 to MSG-004 | Core message operations |
| `02-message-types.json` | MSG-005 to MSG-008 | Text, media, system, and rich messages |
| `03-message-actions.json` | MSG-009 to MSG-012 | Reactions, replies, forwards, edits |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Message Flow                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Client ──► Gateway ──► Message Service ──► MongoDB    │
│                │              │                         │
│                │              ├──► Kafka (events)       │
│                │              │                         │
│                │              └──► Socket.IO (realtime) │
│                │                                        │
│                └──► Media Service (for attachments)     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Message Schema

```typescript
interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  
  // Content
  type: 'text' | 'media' | 'system' | 'rich';
  content: {
    text?: string;
    media?: MediaAttachment[];
    system?: SystemMessageData;
    rich?: RichContent;
  };
  
  // Metadata
  reply_to?: string;
  forwarded_from?: string;
  mentions: string[];
  
  // Status
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  edited: boolean;
  edited_at?: Date;
  deleted: boolean;
  deleted_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

## Message Types

1. **Text Messages**
   - Plain text with markdown support
   - Link previews
   - Mentions (@user)
   - Hashtags

2. **Media Messages**
   - Images (with thumbnails)
   - Videos (with previews)
   - Audio (voice messages)
   - Files (documents)

3. **System Messages**
   - Member joined/left
   - Group name changed
   - Admin actions
   - Call events

4. **Rich Messages**
   - Cards with buttons
   - Carousels
   - Location sharing
   - Contact sharing

## Dependencies

- CONV-003: Conversation Service Layer
- KAFKA-001: Message broker for events
- SOCKET-001: Real-time delivery
- MEDIA-001: Media upload service

## Estimated Effort

- Total Tasks: 12
- Total Hours: ~48 hours
- Priority: High (core feature)
