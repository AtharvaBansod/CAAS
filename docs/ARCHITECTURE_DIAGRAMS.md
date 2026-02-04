# CAAS Phase 1 - Detailed Architecture & Data Flow

**Generated:** 2026-02-04

## 🏗️ Complete System Architecture

```mermaid
graph TB
    subgraph "External Access Layer"
        WEB[Web Browser]
        API_CLIENT[API Client]
    end

    subgraph "Ports Exposed"
        P3000[":3000 Gateway API"]
        P3001[":3001 Metrics"]
        P8080[":8080 Kafka UI"]
        P8081[":8081 Schema Registry"]
        P8082[":8082 Mongo Express"]
        P8083[":8083 Redis Commander"]
    end

    subgraph "Gateway Service Container"
        direction TB
        subgraph "Gateway Entry"
            MAIN["main.ts<br/>Application Entry"]
            APP["app.ts<br/>Fastify Builder"]
        end
        
        subgraph "Middleware Layer"
            MW_LOG["logging.ts<br/>Request Logging"]
            MW_AUTH["auth.ts<br/>JWT Validation"]
            MW_TENANT["tenant.ts<br/>Tenant Resolution"]
            MW_RATE["rate-limit.ts<br/>Rate Limiting"]
        end
        
        subgraph "Routes Layer"
            RT_HEALTH["internal/<br/>Health Routes"]
            RT_AUTH["v1/auth/<br/>Auth Routes"]
            RT_WEBHOOK["v1/webhooks/<br/>Webhook Routes"]
            RT_TENANT["v1/tenant/<br/>Tenant Routes"]
        end
        
        subgraph "Plugins"
            PL_CORS["CORS"]
            PL_HELMET["Helmet"]
            PL_SWAGGER["Swagger"]
            PL_JWT["JWT"]
            PL_REDIS["Redis"]
        end
        
        subgraph "Consumers"
            WEBHOOK_CONSUMER["webhook-consumer.ts<br/>Kafka Consumer"]
        end
    end

    subgraph "Kafka Cluster"
        ZK["Zookeeper<br/>:2181"]
        K1["Kafka-1<br/>:9092/:29092"]
        K2["Kafka-2<br/>:9095"]
        K3["Kafka-3<br/>:9094"]
        SR["Schema Registry<br/>:8081"]
        
        subgraph "Topics"
            T_EVENTS["platform.events"]
            T_AUDIT["platform.audit"]
            T_NOTIF["platform.notifications"]
            T_DLQ["internal.dlq"]
        end
    end

    subgraph "MongoDB Replica Set"
        MP["Primary<br/>:27017"]
        MS1["Secondary-1"]
        MS2["Secondary-2"]
        
        subgraph "Databases"
            DB_PLATFORM["caas_platform"]
            DB_TENANT["tenant_*"]
        end
        
        subgraph "Collections"
            COL_CLIENTS["saas_clients"]
            COL_APPS["applications"]
            COL_KEYS["api_keys"]
        end
    end

    subgraph "Redis Cache"
        REDIS["Redis<br/>:6379"]
        
        subgraph "Key Spaces"
            KS_SESSION["session:*"]
            KS_RATE["rate:*"]
            KS_CACHE["cache:*"]
        end
    end

    WEB --> P3000
    WEB --> P8080
    WEB --> P8082
    WEB --> P8083
    API_CLIENT --> P3000

    P3000 --> MAIN
    MAIN --> APP
    APP --> MW_LOG
    MW_LOG --> MW_AUTH
    MW_AUTH --> MW_TENANT
    MW_TENANT --> MW_RATE
    MW_RATE --> RT_HEALTH
    MW_RATE --> RT_AUTH
    MW_RATE --> RT_WEBHOOK
    MW_RATE --> RT_TENANT

    PL_REDIS --> REDIS
    WEBHOOK_CONSUMER --> K1

    K1 --> ZK
    K2 --> ZK
    K3 --> ZK
    K1 --> T_EVENTS
    K1 --> T_AUDIT

    RT_AUTH --> MP
    RT_TENANT --> MP
    MP --> MS1
    MP --> MS2
    MP --> DB_PLATFORM
```

## 📁 Gateway Service File Structure & Roles

```mermaid
graph LR
    subgraph "services/gateway/"
        subgraph "src/"
            direction TB
            MAIN_TS["main.ts<br/>━━━━━━━━━━━<br/>• Entry point<br/>• Starts server<br/>• Init consumers<br/>• Graceful shutdown"]
            APP_TS["app.ts<br/>━━━━━━━━━━━<br/>• Builds Fastify<br/>• Registers plugins<br/>• Sets middleware<br/>• Mounts routes"]
        end
        
        subgraph "src/config/"
            CFG_INDEX["index.ts<br/>━━━━━━<br/>Loads config"]
            CFG_SCHEMA["schema.ts<br/>━━━━━━<br/>Zod validation"]
        end
        
        subgraph "src/middleware/"
            MW_AUTH2["auth/<br/>━━━━━━<br/>JWT verify"]
            MW_LOG2["logging/<br/>━━━━━━<br/>Request logs"]
            MW_TENANT2["tenant/<br/>━━━━━━<br/>Tenant context"]
            MW_RATE2["rate-limit/<br/>━━━━━━<br/>Throttling"]
            MW_ERR["error/<br/>━━━━━━<br/>Error handler"]
        end
        
        subgraph "src/routes/"
            RT_IDX["index.ts<br/>━━━━━━<br/>Route registry"]
            RT_V1["v1/<br/>━━━━━━<br/>API v1 routes"]
            RT_INT["internal/<br/>━━━━━━<br/>Health/metrics"]
        end
        
        subgraph "src/plugins/"
            PL_LIST["cors.ts<br/>helmet.ts<br/>swagger.ts<br/>jwt.ts<br/>redis.ts"]
        end
        
        subgraph "src/consumers/"
            CONS["webhook-consumer.ts<br/>━━━━━━━━━━━━━━━━<br/>• Kafka consumer<br/>• Event processing<br/>• DLQ handling"]
        end
    end
```

## 🔄 Request Processing Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant GW as Gateway :3000
    participant LOG as Logging MW
    participant AUTH as Auth MW
    participant TEN as Tenant MW
    participant RATE as Rate Limit
    participant ROUTE as Route Handler
    participant REDIS as Redis :6379
    participant MONGO as MongoDB :27017
    participant KAFKA as Kafka :29092

    C->>GW: HTTP Request
    activate GW
    
    GW->>LOG: Log incoming request
    LOG->>LOG: Generate request ID
    LOG->>LOG: Start timer
    
    LOG->>AUTH: Forward request
    AUTH->>AUTH: Extract JWT from header
    AUTH->>AUTH: Verify signature
    alt Invalid JWT
        AUTH-->>C: 401 Unauthorized
    end
    
    AUTH->>TEN: Forward with user context
    TEN->>MONGO: Lookup tenant config
    MONGO-->>TEN: Tenant data
    TEN->>TEN: Set tenant context
    
    TEN->>RATE: Forward with tenant context
    RATE->>REDIS: Check rate limit counter
    REDIS-->>RATE: Current count
    alt Rate limit exceeded
        RATE-->>C: 429 Too Many Requests
    end
    RATE->>REDIS: Increment counter
    
    RATE->>ROUTE: Forward to route handler
    ROUTE->>MONGO: Database operations
    MONGO-->>ROUTE: Data
    ROUTE->>KAFKA: Publish event
    
    ROUTE-->>GW: Response
    GW->>LOG: Log response
    LOG->>LOG: Calculate duration
    
    deactivate GW
    GW-->>C: HTTP Response
```

## 🗃️ Docker Container Relationships

```mermaid
graph TB
    subgraph "Docker Network: caas-network (172.28.0.0/16)"
        subgraph "Database Tier (172.28.1.x)"
            MP["mongodb-primary<br/>172.28.1.1:27017"]
            MS1["mongodb-secondary-1<br/>172.28.1.2"]
            MS2["mongodb-secondary-2<br/>172.28.1.3"]
        end
        
        subgraph "Cache Tier (172.28.2.x)"
            RD["redis<br/>172.28.2.1:6379"]
        end
        
        subgraph "Message Queue Tier (172.28.3.x)"
            ZK["zookeeper<br/>172.28.3.1:2181"]
            K1["kafka-1<br/>172.28.3.2:29092"]
            K2["kafka-2<br/>172.28.3.3"]
            K3["kafka-3<br/>172.28.3.4"]
            SR["schema-registry<br/>172.28.3.5:8081"]
        end
        
        subgraph "Application Tier (172.28.6.x)"
            GW["gateway<br/>172.28.6.1:3000"]
        end
        
        subgraph "Management UIs"
            KUI["kafka-ui<br/>:8080"]
            MEX["mongo-express<br/>:8082"]
            RCMD["redis-commander<br/>:8083"]
        end
    end

    GW --> MP
    GW --> RD
    GW --> K1
    
    K1 --> ZK
    K2 --> ZK
    K3 --> ZK
    K1 --> SR
    
    MP --> MS1
    MP --> MS2
    
    KUI --> K1
    MEX --> MP
    RCMD --> RD
```

## 📊 Kafka Message Flow

```mermaid
flowchart LR
    subgraph "Producers"
        GW["Gateway Service"]
    end
    
    subgraph "Kafka Cluster"
        subgraph "platform.events"
            PE1["Partition 0"]
            PE2["Partition 1"]
            PE3["Partition 2"]
        end
        
        subgraph "platform.audit"
            PA1["Partition 0"]
            PA2["Partition 1"]
            PA3["Partition 2"]
        end
        
        subgraph "internal.dlq"
            DLQ["Dead Letters"]
        end
    end
    
    subgraph "Consumers"
        WC["Webhook Consumer<br/>(in Gateway)"]
        FUTURE["Future Services<br/>(Phase 2+)"]
    end
    
    GW -->|"client.registered"| PE1
    GW -->|"auth.login"| PE2
    GW -->|"webhook.triggered"| PE3
    
    GW -->|"audit.action"| PA1
    
    PE1 --> WC
    PE2 --> WC
    PE3 --> WC
    
    WC -->|"Failed msgs"| DLQ
```

## 🔐 MongoDB Database Structure

```mermaid
erDiagram
    caas_platform ||--o{ saas_clients : contains
    caas_platform ||--o{ applications : contains
    caas_platform ||--o{ api_keys : contains
    caas_platform ||--o{ platform_admins : contains
    
    saas_clients {
        ObjectId _id PK
        String name
        String email
        String hashedSecret
        Array whitelistedIPs
        Array whitelistedDomains
        Object settings
        Date createdAt
        Date updatedAt
    }
    
    applications {
        ObjectId _id PK
        ObjectId clientId FK
        String name
        String environment
        Object config
        Boolean active
    }
    
    api_keys {
        ObjectId _id PK
        ObjectId clientId FK
        String keyHash
        Array scopes
        Date expiresAt
        Boolean revoked
    }
    
    platform_admins {
        ObjectId _id PK
        String email
        String role
        String hashedPassword
    }
```

## 🔄 Init Container Sequence

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant ZK as Zookeeper
    participant K1 as Kafka-1
    participant KI as Kafka-Init
    participant MP as MongoDB-Primary
    participant MI as MongoDB-Init
    participant GW as Gateway

    DC->>ZK: Start
    Note over ZK: Wait for health check
    
    DC->>K1: Start (depends: ZK healthy)
    Note over K1: Wait for broker ready
    
    DC->>KI: Start (depends: K1 healthy)
    KI->>K1: Create topics
    Note over KI: Exit 0
    
    DC->>MP: Start
    Note over MP: Wait for health check
    
    DC->>MI: Start (depends: MP healthy)
    MI->>MP: Init replica set
    MI->>MP: Create databases
    MI->>MP: Create users
    Note over MI: Exit 0
    
    DC->>GW: Start (depends: MI complete, KI complete)
    GW->>MP: Connect
    GW->>K1: Connect
    Note over GW: Ready to serve
```

## 📈 Service Health Dependencies

```mermaid
stateDiagram-v2
    [*] --> Zookeeper
    Zookeeper --> Kafka1: healthy
    Zookeeper --> Kafka2: healthy
    Zookeeper --> Kafka3: healthy
    
    Kafka1 --> SchemaRegistry: healthy
    SchemaRegistry --> KafkaInit: healthy
    KafkaInit --> [Ready]: exit 0
    
    [*] --> MongoDBPrimary
    MongoDBPrimary --> MongoDBSecondary1: healthy
    MongoDBPrimary --> MongoDBSecondary2: healthy
    MongoDBPrimary --> MongoDBInit: healthy
    MongoDBInit --> [Ready]: exit 0
    
    [*] --> Redis
    Redis --> [Ready]: healthy
    
    [Ready] --> Gateway: all dependencies ready
    Gateway --> Serving: healthy
```
