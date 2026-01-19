# API SDK - Messaging API

> **Parent Roadmap**: [API SDK](../../roadmaps/7_apiSdk.md)

---

## Overview

Message API design for sending, receiving, and managing chat messages.

---

## 1. Messages API Interface

```typescript
interface MessagesAPI {
  // Send a message
  send(conversationId: string, message: SendMessageParams): Promise<Message>;
  
  // List messages with pagination
  list(conversationId: string, params?: ListParams): Promise<PaginatedResponse<Message>>;
  
  // Get single message
  get(messageId: string): Promise<Message>;
  
  // Edit a message
  edit(messageId: string, content: string): Promise<Message>;
  
  // Delete a message
  delete(messageId: string): Promise<void>;
  
  // React to a message
  react(messageId: string, emoji: string): Promise<void>;
  removeReaction(messageId: string, emoji: string): Promise<void>;
  
  // Mark as read
  markRead(conversationId: string, messageId: string): Promise<void>;
  
  // Search messages
  search(query: string, params?: SearchParams): Promise<PaginatedResponse<Message>>;
}
```

---

## 2. Implementation

```typescript
class MessagesAPIImpl implements MessagesAPI {
  constructor(private http: HttpClient, private realtime: RealtimeClient) {}
  
  async send(conversationId: string, params: SendMessageParams): Promise<Message> {
    // Optimistic update via realtime
    const tempId = generateTempId();
    const tempMessage = {
      id: tempId,
      conversationId,
      content: params.content,
      type: params.type || 'text',
      status: 'sending',
      createdAt: new Date()
    };
    
    this.realtime.emit('message:optimistic', tempMessage);
    
    try {
      const response = await this.http.post<Message>(
        `/conversations/${conversationId}/messages`,
        {
          content: params.content,
          type: params.type,
          attachments: params.attachments,
          replyTo: params.replyTo,
          metadata: params.metadata
        }
      );
      
      // Replace optimistic with real message
      this.realtime.emit('message:confirmed', { tempId, message: response.data });
      
      return response.data;
    } catch (error) {
      this.realtime.emit('message:failed', { tempId, error });
      throw error;
    }
  }
  
  async list(conversationId: string, params: ListParams = {}): Promise<PaginatedResponse<Message>> {
    const response = await this.http.get<Message[]>(
      `/conversations/${conversationId}/messages`,
      {
        params: {
          limit: params.limit || 50,
          before: params.cursor,
          ...params
        }
      }
    );
    
    return {
      data: response.data,
      hasMore: response.data.length === (params.limit || 50),
      nextCursor: response.data[response.data.length - 1]?.id
    };
  }
  
  async edit(messageId: string, content: string): Promise<Message> {
    const response = await this.http.patch<Message>(
      `/messages/${messageId}`,
      { content }
    );
    return response.data;
  }
  
  async delete(messageId: string): Promise<void> {
    await this.http.delete(`/messages/${messageId}`);
  }
  
  async markRead(conversationId: string, messageId: string): Promise<void> {
    await this.http.post(`/conversations/${conversationId}/read`, {
      lastReadMessageId: messageId
    });
  }
}
```

---

## 3. Message Types

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'call';
  content: string;
  
  attachments?: Attachment[];
  
  replyTo?: {
    messageId: string;
    preview: string;
  };
  
  reactions?: Record<string, string[]>;  // emoji -> userIds
  
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: string[];
  
  edited?: boolean;
  
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt?: Date;
}

interface SendMessageParams {
  content: string;
  type?: Message['type'];
  attachments?: AttachmentUpload[];
  replyTo?: string;
  metadata?: Record<string, any>;
}
```

---

## 4. Attachments

```typescript
interface AttachmentUpload {
  file: File | Blob;
  name?: string;
  type?: string;
}

// Upload and send in one call
async function sendWithAttachments(
  conversationId: string,
  message: string,
  files: File[]
): Promise<Message> {
  // Upload files first
  const attachments = await Promise.all(
    files.map(file => caas.files.upload(file))
  );
  
  // Send message with attachment references
  return caas.messages.send(conversationId, {
    content: message,
    attachments: attachments.map(a => ({
      id: a.id,
      type: a.type,
      url: a.url,
      name: a.name,
      size: a.size
    }))
  });
}
```

---

## 5. Read Receipts

```typescript
// Track read status
interface ReadReceipt {
  userId: string;
  messageId: string;
  readAt: Date;
}

// Client tracks last read
class ReadReceiptManager {
  private lastRead: Record<string, string> = {};
  
  async markRead(conversationId: string, messageId: string): Promise<void> {
    if (this.lastRead[conversationId] === messageId) return;
    
    this.lastRead[conversationId] = messageId;
    
    await caas.messages.markRead(conversationId, messageId);
  }
}
```

---

## 6. Example Usage

```typescript
// Initialize
const caas = new CaasClient({ token });

// Send text message
const message = await caas.messages.send('conv_123', {
  content: 'Hello World!'
});

// Send with reply
await caas.messages.send('conv_123', {
  content: 'This is a reply',
  replyTo: 'msg_456'
});

// List messages
const { data: messages, hasMore } = await caas.messages.list('conv_123', {
  limit: 50
});

// React
await caas.messages.react('msg_789', '👍');

// Search
const results = await caas.messages.search('meeting', {
  conversationId: 'conv_123'
});
```

---

## Related Documents
- [HTTP Client](./http-client.md)
- [Realtime Events](./realtime-events.md)
