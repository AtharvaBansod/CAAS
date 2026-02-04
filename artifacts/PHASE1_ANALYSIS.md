# CAAS Phase 1 - Deep Dive Analysis

**Generated:** 2026-02-04

## 📊 System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        CLIENT[External Clients]
    end

    subgraph "API Gateway Layer"
        GW[Gateway Service<br/>Port: 3000, 3001]
    end

    subgraph "Monitoring & Admin UIs"
        KAFKAUI[Kafka UI<br/>Port: 8080]
        MONGOUI[Mongo Express<br/>Port: 8082]
        REDISUI[Redis Commander<br/>Port: 8083]
    end

    subgraph "Message Queue Layer"
        ZK[Zookeeper<br/>Port: 2181]
        K1[Kafka Broker 1<br/>Port: 9092, 29092]
        K2[Kafka Broker 2<br/>Port: 9095]
        K3[Kafka Broker 3<br/>Port: 9094]
        SR[Schema Registry<br/>Port: 8081]
    end

    subgraph "Cache Layer"
        REDIS[Redis<br/>Port: 6379]
    end

    subgraph "Database Layer"
        MP[MongoDB Primary<br/>Port: 27017]
        MS1[MongoDB Secondary 1]
        MS2[MongoDB Secondary 2]
    end

    CLIENT --> GW
    GW --> REDIS
    GW --> K1
    GW --> MP

    K1 --> ZK
    K2 --> ZK
    K3 --> ZK
    K1 --> SR
    K2 --> SR
    K3 --> SR

    MP --> MS1
    MP --> MS2

    KAFKAUI --> K1
    MONGOUI --> MP
    REDISUI --> REDIS
```

## 📁 File Structure Analysis

### Current Structure (Before Cleanup)
```
c:\me\caas\
├── .env                        # ✅ Keep - Root environment config
├── .gitignore                  # ✅ Keep
├── .dockerignore               # ✅ Keep
├── docker-compose.yml          # ✅ Keep - Main compose file
├── start.ps1                   # ✅ Keep - Startup script
├── stop.ps1                    # ✅ Keep - Stop script
├── test-system.ps1             # 🔄 Move to tests/
├── README.md                   # ✅ Keep
│
├── DEPLOYMENT_SUMMARY.md       # 🗑️ Empty - Delete
├── SYSTEM_OVERVIEW.md          # 🔄 Move to docs/
├── SYSTEM_STATUS.md            # 🔄 Move to docs/
├── TESTING_GUIDE.md            # 🔄 Move to docs/
│
├── init/mongodb/               # ✅ Keep - Required for Docker
├── services/                   # ✅ Keep - Main services
│   ├── gateway/
│   │   ├── node_modules/       # 🗑️ Delete - Not needed for Docker
│   │   ├── .env                # 🗑️ Delete - Uses compose env
│   │   └── ...
│   ├── kafka-service/          # ✅ Keep - Library code
│   └── mongodb-service/        # ✅ Keep - Library code
│
├── docs/                       # ✅ Keep - Documentation
├── tasks/                      # ✅ Keep - Task tracking
│
├── local/                      # 🔄 Review - Old development files
├── deepDive/                   # 🔄 Move to docs/architecture/
├── flowdiagram/                # 🔄 Move to docs/diagrams/
├── rnd/                        # 🔄 Move to docs/research/
├── schemas/                    # 🔄 Move to docs/schemas/
└── roadmaps/                   # 🔄 Move to docs/roadmaps/
```

## 🔍 Service Deep Dive

### 1. Gateway Service (`services/gateway/`)

**Purpose:** API Gateway - Entry point for all external requests

**Key Files:**
| File | Role | Description |
|------|------|-------------|
| `src/main.ts` | Entry Point | Starts Fastify server, initializes Kafka consumer |
| `src/app.ts` | App Builder | Configures Fastify with plugins, middleware, routes |
| `src/config/` | Configuration | Environment validation with Zod |
| `src/routes/` | API Routes | v1 routes for auth, webhooks, tenants |
| `src/middleware/` | Middleware | Auth, logging, rate-limit, tenant resolution |
| `src/plugins/` | Fastify Plugins | CORS, JWT, Redis, Swagger |
| `src/consumers/` | Kafka Consumers | Webhook consumer for async events |

**Flow Diagram:**
```mermaid
sequenceDiagram
    participant C as Client
    participant GW as Gateway
    participant MW as Middleware
    participant R as Routes
    participant DB as MongoDB
    participant K as Kafka
    participant RD as Redis

    C->>GW: HTTP Request
    GW->>MW: Logging Plugin
    MW->>MW: Auth Plugin (JWT)
    MW->>MW: Tenant Resolution
    MW->>MW: Rate Limiting
    MW->>R: Route Handler
    R->>DB: Database Query
    R->>RD: Cache Check
    R->>K: Publish Event
    R-->>GW: Response
    GW-->>C: HTTP Response
```

### 2. MongoDB Service (`services/mongodb-service/`)

**Purpose:** Database abstraction layer with multi-tenancy support

**Key Files:**
| File | Role | Description |
|------|------|-------------|
| `src/index.ts` | Library Export | Main exports for other services |
| `src/connections/` | Connection Pool | MongoDB connection management |
| `src/repositories/` | Data Access | Repository pattern implementation |
| `src/config/` | Configuration | MongoDB connection settings |
| `src/seeds/` | Seed Data | Initial data setup scripts |

**Note:** This is a **library**, not a running service. It's imported by Gateway.

### 3. Kafka Service (`services/kafka-service/`)

**Purpose:** Kafka producer/consumer library

**Key Files:**
| File | Role | Description |
|------|------|-------------|
| `src/index.ts` | Library Export | Main exports for Kafka operations |
| `src/client/` | Kafka Client | KafkaJS client configuration |
| `src/topics/` | Topic Management | Topic definitions and configurations |
| `src/schemas/` | Event Schemas | Avro/JSON schemas for events |
| `src/config/` | Configuration | Broker settings, SSL, etc. |

**Note:** This is a **library**, not a running service. It's imported by Gateway.

## 📊 Docker Services Analysis

### Phase 1 Services (14 containers)

| Service | Image | Ports | Health Check | Role |
|---------|-------|-------|--------------|------|
| mongodb-primary | mongo:7.0 | 27017 | mongosh ping | Primary database |
| mongodb-secondary-1 | mongo:7.0 | - | - | Replica member |
| mongodb-secondary-2 | mongo:7.0 | - | - | Replica member |
| mongodb-init | mongo:7.0 | - | Exits | Init replica set |
| redis | redis:7-alpine | 6379 | redis-cli ping | Cache |
| zookeeper | cp-zookeeper:7.5.0 | 2181 | srvr command | Kafka coordination |
| kafka-1 | cp-kafka:7.5.0 | 9092, 29092 | kafka-broker-api-versions | Message broker |
| kafka-2 | cp-kafka:7.5.0 | 9095 | - | Message broker |
| kafka-3 | cp-kafka:7.5.0 | 9094 | - | Message broker |
| kafka-init | cp-kafka:7.5.0 | - | Exits | Create topics |
| schema-registry | cp-schema-registry:7.5.0 | 8081 | curl | Schema management |
| gateway | custom build | 3000, 3001 | wget (issue) | API Gateway |
| kafka-ui | kafka-ui:latest | 8080 | - | Kafka admin |
| mongo-express | mongo-express:latest | 8082 | - | MongoDB admin |
| redis-commander | redis-commander:latest | 8083 | - | Redis admin |

## 🔧 Issues & Fixes

### Issue 1: Gateway Health Check
**Problem:** Health check uses `wget --spider` which doesn't properly detect JSON response
**Fix:** Change to node-based health check or use curl

### Issue 2: Local node_modules
**Problem:** 226 packages in local filesystem, not needed for Docker
**Fix:** Delete local node_modules, add to .gitignore, .dockerignore

### Issue 3: Scattered Documentation
**Problem:** MD files scattered in root directory
**Fix:** Move to appropriate docs/ subdirectories

### Issue 4: Duplicate Environment Files
**Problem:** .env exists in root AND services/gateway/
**Fix:** Remove service-level .env, use docker-compose environment only

## 📍 Access Points Summary

| Service | URL | Credentials |
|---------|-----|-------------|
| Gateway API | http://localhost:3000 | - |
| Gateway Metrics | http://localhost:3001 | - |
| API Documentation | http://localhost:3000/documentation | - |
| Kafka UI | http://localhost:8080 | - |
| MongoDB Express | http://localhost:8082 | admin / admin123 |
| Redis Commander | http://localhost:8083 | - |
| MongoDB | mongodb://localhost:27017 | caas_admin / caas_secret_2026 |
| Redis | redis://localhost:6379 | caas_redis_2026 |

## 🚀 Commands

```powershell
# Start all services
.\start.ps1

# Stop all services
.\stop.ps1

# View logs
docker compose logs -f gateway

# Restart specific service
docker compose restart gateway

# Check status
docker compose ps
```
