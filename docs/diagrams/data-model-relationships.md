# Data Model Relationships

> Entity relationship diagram for CAAS database structure.

---

## ER Diagram

```mermaid
erDiagram
    TENANT ||--o{ APPLICATION : owns
    TENANT ||--o{ API_KEY : has
    TENANT ||--o{ USER : contains
    
    APPLICATION ||--o{ API_KEY : uses
    APPLICATION ||--o{ SETTINGS : has
    
    USER ||--o{ CONVERSATION_PARTICIPANT : participates
    USER ||--o{ MESSAGE : sends
    USER ||--o{ USER_DEVICE : uses
    USER ||--o{ KEY_BUNDLE : has
    
    CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : has
    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION ||--o{ ROOM : maps_to
    
    MESSAGE ||--o{ ATTACHMENT : has
    MESSAGE ||--o{ REACTION : receives
    MESSAGE ||--o{ READ_RECEIPT : has
    
    TENANT {
        ObjectId _id PK
        string name
        string plan
        string status
        datetime created_at
    }
    
    APPLICATION {
        ObjectId _id PK
        ObjectId tenant_id FK
        string name
        string[] domains
        json settings
    }
    
    USER {
        ObjectId _id PK
        ObjectId tenant_id FK
        string external_id
        string display_name
        string avatar_url
        json metadata
    }
    
    CONVERSATION {
        ObjectId _id PK
        ObjectId tenant_id FK
        string type
        string name
        json settings
        datetime last_message_at
    }
    
    MESSAGE {
        ObjectId _id PK
        ObjectId tenant_id FK
        ObjectId conversation_id FK
        ObjectId sender_id FK
        string type
        string content
        datetime created_at
    }
```

---

## Collection Relationships

### Tenant Hierarchy
```
Tenant
├── Applications[]
│   ├── API Keys[]
│   └── Settings
├── Users[]
│   ├── Devices[]
│   └── Key Bundles[]
└── Conversations[]
    ├── Participants[]
    └── Messages[]
```

---

## Index Strategy

| Collection | Indexes | Purpose |
|------------|---------|---------|
| users | `{tenant_id: 1, external_id: 1}` | Unique user per tenant |
| conversations | `{tenant_id: 1, participants.user_id: 1}` | Find user's conversations |
| messages | `{tenant_id: 1, conversation_id: 1, created_at: -1}` | Message pagination |
| messages | `{tenant_id: 1, sender_id: 1, created_at: -1}` | User's sent messages |

---

## Sharding Strategy

```
// Shard key for messages collection
{ tenant_id: 1, conversation_id: 1 }

// This ensures:
// 1. All messages for a tenant are colocated
// 2. Messages within a conversation are on same shard
// 3. Queries by tenant+conversation are efficient
```

---

## Related Documents
- [MongoDB Service Roadmap](../roadmaps/4_mongodbService.md)
- [Caching Strategy](../deepDive/mongodbService/caching-strategy.md)
