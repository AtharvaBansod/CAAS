# Socket Service - Protocol Design

> **Parent Roadmap**: [Socket Service](../../roadmaps/5_sockets.md)

---

## Overview

WebSocket message protocol specification for CAAS real-time communication.

---

## 1. Message Frame Structure

```typescript
interface SocketMessage {
  // Header
  id: string;              // Unique message ID (UUID)
  type: string;            // Event type (e.g., 'message:send')
  version: number;         // Protocol version (1)
  timestamp: number;       // Unix timestamp ms
  
  // Routing
  tenantId?: string;       // For server-side routing
  conversationId?: string; // Target conversation
  
  // Payload
  data: unknown;           // Event-specific data
  
  // Acknowledgment
  ack?: boolean;           // Requires acknowledgment
  replyTo?: string;        // ID of message being replied to
}

// Example message
{
  "id": "msg_abc123",
  "type": "message:send",
  "version": 1,
  "timestamp": 1705654321000,
  "conversationId": "conv_xyz",
  "data": {
    "content": "Hello!",
    "type": "text"
  },
  "ack": true
}
```

---

## 2. Event Types

### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `message:send` | Send a message | `{ content, type, attachments? }` |
| `message:edit` | Edit a message | `{ messageId, content }` |
| `message:delete` | Delete a message | `{ messageId }` |
| `typing:start` | Start typing | `{ conversationId }` |
| `typing:stop` | Stop typing | `{ conversationId }` |
| `presence:update` | Update status | `{ status, customMessage? }` |
| `conversation:join` | Join room | `{ conversationId }` |
| `conversation:leave` | Leave room | `{ conversationId }` |
| `call:initiate` | Start call | `{ targetUserId, type }` |
| `call:answer` | Answer call | `{ callId }` |
| `call:reject` | Reject call | `{ callId }` |
| `call:end` | End call | `{ callId }` |

### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `message:new` | New message received | `Message` |
| `message:updated` | Message was edited | `{ messageId, content }` |
| `message:deleted` | Message was deleted | `{ messageId }` |
| `typing:update` | Typing indicator | `{ userId, conversationId, typing }` |
| `presence:update` | User status changed | `{ userId, status }` |
| `call:incoming` | Incoming call | `{ callId, callerId, type }` |
| `call:answered` | Call was answered | `{ callId }` |
| `call:ended` | Call ended | `{ callId, duration }` |
| `error` | Error occurred | `{ code, message }` |

---

## 3. Acknowledgment Protocol

```typescript
// Client sends with ack flag
socket.emit('message:send', {
  id: 'msg_123',
  type: 'message:send',
  ack: true,
  data: { content: 'Hello' }
});

// Server responds with ack
socket.on('message:send', async (msg, callback) => {
  try {
    const result = await handleMessage(msg);
    callback({ 
      success: true, 
      messageId: result.id,
      timestamp: result.createdAt
    });
  } catch (error) {
    callback({ 
      success: false, 
      error: { code: error.code, message: error.message }
    });
  }
});
```

---

## 4. Error Codes

```typescript
enum ErrorCode {
  // Authentication
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Authorization
  FORBIDDEN = 'FORBIDDEN',
  NOT_MEMBER = 'NOT_MEMBER',
  
  // Validation
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  MISSING_FIELD = 'MISSING_FIELD',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNAVAILABLE = 'UNAVAILABLE'
}

// Error response format
interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  retryAfter?: number;  // For rate limiting
}
```

---

## 5. Binary Protocol (for media)

```typescript
// Binary message header (first 16 bytes)
// [4 bytes: total length]
// [4 bytes: header length]
// [4 bytes: message type]
// [4 bytes: sequence number]
// [remaining: JSON header + binary payload]

interface BinaryMessage {
  header: {
    type: 'audio' | 'video' | 'file_chunk';
    conversationId: string;
    chunkIndex: number;
    totalChunks: number;
    mimeType: string;
  };
  payload: ArrayBuffer;
}

// Sending binary
const header = JSON.stringify(message.header);
const headerBuffer = new TextEncoder().encode(header);
const combined = new Uint8Array(16 + headerBuffer.length + message.payload.byteLength);
// ... pack header and payload
socket.emit('binary', combined.buffer);
```

---

## 6. Compression

```typescript
// Enable per-message compression for large payloads
const socket = io(url, {
  perMessageDeflate: {
    threshold: 1024,  // Compress messages > 1KB
    zlibDeflateOptions: {
      level: 6
    }
  }
});
```

---

## Related Documents
- [Connection Management](./connection-management.md)
- [Message Routing](./message-routing.md)
