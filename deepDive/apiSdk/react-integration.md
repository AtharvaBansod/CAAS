# API SDK - React Integration

> **Parent Roadmap**: [API SDK](../../roadmaps/7_apiSdk.md)

---

## Overview

React hooks, providers, and components for integrating CAAS SDK into React applications.

---

## 1. Provider Setup

```tsx
import { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { CaasClient } from '@caas/sdk';

interface CaasContextValue {
  client: CaasClient;
  isConnected: boolean;
  user: User | null;
}

const CaasContext = createContext<CaasContextValue | null>(null);

export function CaasProvider({
  token,
  children,
  config
}: {
  token: string;
  children: React.ReactNode;
  config?: CaasConfig;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const client = useMemo(() => {
    return new CaasClient({ token, ...config });
  }, [token, config]);
  
  useEffect(() => {
    client.on('connected', () => setIsConnected(true));
    client.on('disconnected', () => setIsConnected(false));
    client.on('user:loaded', (u) => setUser(u));
    
    client.connect();
    
    return () => {
      client.disconnect();
    };
  }, [client]);
  
  const value = useMemo(
    () => ({ client, isConnected, user }),
    [client, isConnected, user]
  );
  
  return (
    <CaasContext.Provider value={value}>
      {children}
    </CaasContext.Provider>
  );
}

export function useCaas() {
  const context = useContext(CaasContext);
  if (!context) {
    throw new Error('useCaas must be used within CaasProvider');
  }
  return context;
}
```

---

## 2. Core Hooks

### useConversations
```tsx
export function useConversations() {
  const { client } = useCaas();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const load = async () => {
      const list = await client.conversations.list();
      setConversations(list);
      setIsLoading(false);
    };
    
    load();
    
    return client.conversations.subscribe({
      onCreated: (c) => setConversations(prev => [c, ...prev]),
      onUpdated: (c) => setConversations(prev => 
        prev.map(x => x.id === c.id ? c : x)
      ),
      onDeleted: (id) => setConversations(prev => 
        prev.filter(x => x.id !== id)
      )
    });
  }, [client]);
  
  return { conversations, isLoading };
}
```

### useMessages
```tsx
export function useMessages(conversationId: string) {
  const { client } = useCaas();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    const load = async () => {
      const { data, hasNext } = await client.messages.list(conversationId);
      setMessages(data);
      setHasMore(hasNext);
      setIsLoading(false);
    };
    
    load();
    
    return client.conversations.subscribe(conversationId, {
      onMessage: (msg) => setMessages(prev => [...prev, msg])
    });
  }, [client, conversationId]);
  
  const loadMore = async () => {
    if (!hasMore) return;
    const oldest = messages[0];
    const { data, hasNext } = await client.messages.list(conversationId, {
      before: oldest?.id
    });
    setMessages(prev => [...data, ...prev]);
    setHasMore(hasNext);
  };
  
  const send = async (content: string) => {
    await client.messages.send(conversationId, { content });
  };
  
  return { messages, isLoading, hasMore, loadMore, send };
}
```

### usePresence
```tsx
export function usePresence(userIds: string[]) {
  const { client } = useCaas();
  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  
  useEffect(() => {
    return client.presence.subscribe(userIds, (update) => {
      setPresence(prev => ({
        ...prev,
        [update.userId]: update.status
      }));
    });
  }, [client, userIds.join(',')]);
  
  return presence;
}
```

---

## 3. UI Components

### ChatWidget
```tsx
export function ChatWidget() {
  const { isConnected } = useCaas();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  if (!isConnected) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="caas-widget">
      <ConversationList 
        onSelect={setSelectedId} 
        selectedId={selectedId} 
      />
      {selectedId && (
        <ChatWindow conversationId={selectedId} />
      )}
    </div>
  );
}
```

---

## 4. Usage Example

```tsx
import { CaasProvider, ChatWidget } from '@caas/react';

function App() {
  const token = useAuth().caasToken; // Get from your auth system
  
  return (
    <CaasProvider token={token}>
      <ChatWidget />
    </CaasProvider>
  );
}
```

---

## Related Documents
- [Realtime Events](./realtime-events.md)
- [HTTP Client](./http-client.md)
