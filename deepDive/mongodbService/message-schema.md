# MongoDB Message Schema Design

> **Parent Roadmap**: [MongoDB Service](../../roadmaps/4_mongodbService.md)

---

## Overview

Schema design for the messages collection supporting various message types and efficient querying.

---

## 1. Message Schema

```typescript
interface Message {
  _id: ObjectId;
  tenant_id: ObjectId;           // Tenant isolation
  conversation_id: ObjectId;     // Parent conversation
  sender_id: ObjectId;           // User who sent
  
  // Message content
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'call';
  content: {
    text?: string;               // For text messages
    html?: string;               // Sanitized HTML
    mentions?: Mention[];        // @mentions
  };
  
  // Attachments
  attachments?: Attachment[];
  
  // Threading
  thread_id?: ObjectId;          // For threaded replies
  reply_to?: ObjectId;           // Direct reply reference
  
  // Status
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  
  // Encryption (E2E)
  encrypted?: {
    ciphertext: string;          // Encrypted content
    session_id: string;          // Sender's session
    key_id: string;              // Key used
  };
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Reactions
  reactions?: {
    [emoji: string]: ObjectId[];  // emoji -> user_ids
  };
  
  // Timestamps
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;             // Soft delete
  
  // Edit history
  edited?: boolean;
  edit_history?: EditRecord[];
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail_url?: string;
  filename: string;
  size: number;                  // bytes
  mime_type: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;           // for audio/video
  };
}

interface Mention {
  user_id: ObjectId;
  display_name: string;
  start: number;                 // Position in text
  length: number;
}
```

---

## 2. Indexes

```javascript
// Primary query index: conversation message list
db.messages.createIndex(
  { tenant_id: 1, conversation_id: 1, created_at: -1 },
  { name: 'idx_conversation_messages' }
);

// User's messages
db.messages.createIndex(
  { tenant_id: 1, sender_id: 1, created_at: -1 },
  { name: 'idx_user_messages' }
);

// Thread messages
db.messages.createIndex(
  { tenant_id: 1, thread_id: 1, created_at: 1 },
  { name: 'idx_thread_messages',
    partialFilterExpression: { thread_id: { $exists: true } }
  }
);

// Search mentions
db.messages.createIndex(
  { tenant_id: 1, 'content.mentions.user_id': 1, created_at: -1 },
  { name: 'idx_mentions' }
);

// Text search
db.messages.createIndex(
  { 'content.text': 'text', tenant_id: 1 },
  { name: 'idx_text_search' }
);
```

---

## 3. Query Patterns

```typescript
// Get conversation messages (paginated)
async function getMessages(conversationId: string, before?: string, limit = 50) {
  const query: any = {
    tenant_id: tenantId,
    conversation_id: new ObjectId(conversationId),
    deleted_at: null
  };
  
  if (before) {
    query.created_at = { $lt: new Date(before) };
  }
  
  return db.messages
    .find(query)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

// Get thread messages
async function getThreadMessages(threadId: string) {
  return db.messages
    .find({
      tenant_id: tenantId,
      thread_id: new ObjectId(threadId)
    })
    .sort({ created_at: 1 })
    .toArray();
}
```

---

## 4. Size Optimization

| Field | Max Size | Strategy |
|-------|----------|----------|
| content.text | 10KB | Truncate on client |
| attachments | 10 items | Limit per message |
| reactions | 50 unique | Limit reaction types |
| edit_history | 10 edits | Prune oldest |

---

## Related Documents
- [Caching Strategy](./caching-strategy.md)
- [Query Optimization](./query-optimization.md)
