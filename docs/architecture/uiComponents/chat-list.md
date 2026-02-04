# UI Components - Chat List Implementation

> **Parent Roadmap**: [UI Components](../../roadmaps/6_uiComponents.md)

---

## Overview

High-performance virtualized chat list component for displaying conversations.

---

## 1. Virtualization Architecture

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

interface ChatListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export function ChatList({ conversations, onSelect, selectedId }: ChatListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,        // Row height
    overscan: 10,                  // Extra items to render
  });
  
  return (
    <div 
      ref={parentRef} 
      className="caas-chat-list"
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <ChatListItem
            key={virtualRow.key}
            conversation={conversations[virtualRow.index]}
            isSelected={conversations[virtualRow.index].id === selectedId}
            onClick={() => onSelect(conversations[virtualRow.index].id)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 2. Chat List Item Component

```typescript
interface ChatListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  style: CSSProperties;
}

const ChatListItem = memo(function ChatListItem({
  conversation,
  isSelected,
  onClick,
  style
}: ChatListItemProps) {
  const { name, avatarUrl, lastMessage, unreadCount, isOnline } = conversation;
  
  return (
    <div
      className={cn(
        'caas-chat-list-item',
        isSelected && 'caas-chat-list-item--selected'
      )}
      style={style}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <Avatar 
        src={avatarUrl} 
        name={name} 
        status={isOnline ? 'online' : 'offline'} 
      />
      
      <div className="caas-chat-list-item__content">
        <div className="caas-chat-list-item__header">
          <span className="caas-chat-list-item__name">{name}</span>
          <span className="caas-chat-list-item__time">
            {formatRelativeTime(lastMessage?.timestamp)}
          </span>
        </div>
        
        <div className="caas-chat-list-item__preview">
          <span className="caas-chat-list-item__message">
            {lastMessage?.preview || 'No messages'}
          </span>
          {unreadCount > 0 && (
            <span className="caas-chat-list-item__badge">{unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
});
```

---

## 3. Performance Optimizations

### Memoization
```typescript
// Memo comparison function
const areEqual = (prev: ChatListItemProps, next: ChatListItemProps) => {
  return (
    prev.conversation.id === next.conversation.id &&
    prev.conversation.lastMessage?.id === next.conversation.lastMessage?.id &&
    prev.conversation.unreadCount === next.conversation.unreadCount &&
    prev.isSelected === next.isSelected
  );
};

const ChatListItem = memo(ChatListItemComponent, areEqual);
```

### Debounced Updates
```typescript
function useDebouncedConversations(conversations: Conversation[], delay = 100) {
  const [debounced, setDebounced] = useState(conversations);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(conversations), delay);
    return () => clearTimeout(timer);
  }, [conversations, delay]);
  
  return debounced;
}
```

---

## 4. CSS Styles

```css
.caas-chat-list {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--caas-color-border);
}

.caas-chat-list-item {
  display: flex;
  align-items: center;
  padding: var(--caas-space-sm) var(--caas-space-md);
  cursor: pointer;
  transition: background-color var(--caas-transition-fast);
}

.caas-chat-list-item:hover {
  background-color: var(--caas-color-surface-hover);
}

.caas-chat-list-item--selected {
  background-color: var(--caas-color-primary);
  color: var(--caas-color-text-inverse);
}

.caas-chat-list-item__badge {
  min-width: 20px;
  height: 20px;
  border-radius: var(--caas-radius-full);
  background-color: var(--caas-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--caas-font-font-size-xs);
}
```

---

## Related Documents
- [Build System](./build-system.md)
- [Theming](./theming.md)
