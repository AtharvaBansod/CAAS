# API SDK - Real-time Event System

> **Parent Roadmap**: [API SDK](../../roadmaps/7_apiSdk.md)

---

## Overview

Event subscription and real-time updates for the CAAS SDK.

---

## 1. Event Architecture

```typescript
// Event emitter pattern
interface CaasEvents {
  'connected': () => void;
  'disconnected': (reason: string) => void;
  'message': (message: Message) => void;
  'message:sent': (message: Message) => void;
  'typing': (event: TypingEvent) => void;
  'presence': (event: PresenceEvent) => void;
  'conversation:updated': (conversation: Conversation) => void;
}

class CaasClient extends EventEmitter<CaasEvents> {
  // Usage
  // caas.on('message', (msg) => { ... });
}
```

---

## 2. Subscription API

```typescript
// Global event listeners
caas.on('message', (message) => {
  console.log('New message:', message);
});

// Scoped subscriptions
const unsubscribe = caas.conversations.subscribe('conv-123', {
  onMessage: (msg) => displayMessage(msg),
  onTyping: (event) => showTypingIndicator(event),
  onRead: (receipt) => updateReadReceipts(receipt)
});

// Cleanup on unmount
useEffect(() => {
  return () => unsubscribe();
}, []);

// Presence subscriptions
caas.presence.subscribe(['user-1', 'user-2'], (update) => {
  updateContactStatus(update.userId, update.status);
});
```

---

## 3. Socket Message Handling

```typescript
class RealtimeClient {
  private socket: Socket;
  private eventHandlers = new Map<string, Set<Function>>();
  
  constructor() {
    this.socket = io(SOCKET_URL, { autoConnect: false });
    this.setupEventRouting();
  }
  
  private setupEventRouting() {
    // Map socket events to SDK events
    this.socket.on('message:new', (data) => {
      this.emit('message', this.parseMessage(data));
    });
    
    this.socket.on('typing:update', (data) => {
      this.emit('typing', data);
    });
    
    this.socket.on('presence:update', (data) => {
      this.emit('presence', data);
    });
  }
  
  on<E extends keyof CaasEvents>(event: E, handler: CaasEvents[E]) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    
    return () => this.off(event, handler);
  }
  
  private emit<E extends keyof CaasEvents>(event: E, ...args: Parameters<CaasEvents[E]>) {
    this.eventHandlers.get(event)?.forEach(handler => handler(...args));
  }
}
```

---

## 4. Event Replay for Missed Events

```typescript
// On reconnect, fetch missed events
async function syncMissedEvents(lastEventId: string) {
  const missed = await caas.events.getSince(lastEventId);
  
  for (const event of missed) {
    await processEvent(event);
  }
  
  // Update last processed ID
  localStorage.setItem('lastEventId', missed[missed.length - 1]?.id);
}

// Track last event for replay
caas.on('*', (event) => {
  if (event.id) {
    localStorage.setItem('lastEventId', event.id);
  }
});
```

---

## 5. React Hooks

```typescript
// useMessages hook
function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const client = useCaasClient();
  
  useEffect(() => {
    // Load initial messages
    client.messages.list(conversationId).then(setMessages);
    
    // Subscribe to new messages
    return client.conversations.subscribe(conversationId, {
      onMessage: (msg) => {
        setMessages(prev => [...prev, msg]);
      }
    });
  }, [conversationId]);
  
  return messages;
}

// usePresence hook
function usePresence(userIds: string[]) {
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const client = useCaasClient();
  
  useEffect(() => {
    return client.presence.subscribe(userIds, (update) => {
      setPresence(prev => ({
        ...prev,
        [update.userId]: update.status
      }));
    });
  }, [userIds.join(',')]);
  
  return presence;
}
```

---

## Related Documents
- [HTTP Client Architecture](./http-client.md)
- [SDK Authentication Flow](../../flowdiagram/sdk-auth-flow.md)
