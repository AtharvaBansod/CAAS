# CAAS Services

> **Microservices Architecture for Chat-As-A-Service Platform**

---

## 📋 Overview

This directory contains all microservices for the CAAS platform. Each service is designed to be independently deployable, scalable, and maintainable.

---

## 🗂️ Service Directory

### Phase 1: Infrastructure Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| [mongodb-service](./mongodb-service/) | ✅ Ready | Database abstraction layer with multi-tenancy | - | [README](./mongodb-service/README.md) |
| kafka-service | 🔄 Planned | Message queue service | - | - |
| gateway | 🔄 Planned | API Gateway with routing & rate limiting | 3000 | - |

### Phase 2: Security Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| auth-service | 🔄 Planned | Authentication & JWT management | 3001 | - |
| authz-service | 🔄 Planned | Authorization & ABAC engine | 3002 | - |
| encryption-service | 🔄 Planned | E2E encryption key management | 3003 | - |

### Phase 3: Real-Time Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| socket-service | 🔄 Planned | WebSocket connections | 3004 | - |
| presence-service | 🔄 Planned | User presence tracking | 3005 | - |
| event-router | 🔄 Planned | Real-time event routing | 3006 | - |

### Phase 4: Messaging Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| messaging-service | 🔄 Planned | Message handling & delivery | 3007 | - |
| media-service | 🔄 Planned | File upload & processing | 3008 | - |
| search-service | 🔄 Planned | Message search (Elasticsearch) | 3009 | - |

### Phase 5: Observability Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| logging-service | 🔄 Planned | Centralized logging | 3010 | - |
| metrics-service | 🔄 Planned | Metrics collection | 3011 | - |
| analytics-service | 🔄 Planned | Analytics aggregation | 3012 | - |

### Phase 6: Client Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| admin-portal | 🔄 Planned | Client admin dashboard | 3100 | - |
| widget-server | 🔄 Planned | Embeddable widget server | 3101 | - |

### Phase 7: Billing Services

| Service | Status | Description | Port | Documentation |
|---------|--------|-------------|------|---------------|
| billing-service | 🔄 Planned | Usage metering & billing | 3013 | - |
| payment-service | 🔄 Planned | Payment processing (Stripe) | 3014 | - |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (or npm/yarn)

### Setup All Services

```bash
# Navigate to local directory
cd ../local

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# For testing: MONGO_REPLICA_COUNT=1
# For production: MONGO_REPLICA_COUNT=3

# Start infrastructure (MongoDB, Redis, Kafka, etc.)
docker-compose up -d

# Initialize MongoDB (creates users and databases)
docker-compose --profile tools up mongodb-init
```

### Start Individual Service

```bash
# Navigate to specific service
cd services/mongodb-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run in development mode
npm run dev
```

---

## 🏗️ Architecture

### Service Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway (Port 3000)                 │
│                         Entry point for all requests            │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┬─────────
             │              │              │              │
     ┌───────▼──────┐  ┌───▼────┐  ┌──────▼─────┐  ┌────▼─────┐
     │  Auth Service │  │ Socket │  │  Messaging │  │ Billing  │
     │   (Port 3001) │  │ Service│  │   Service  │  │ Service  │
     └───────┬───────┘  └───┬────┘  └──────┬─────┘  └────┬─────┘
             │              │              │              │
             └──────────────┴──────────────┴──────────────┘
                            │
                    ┌───────▼────────┐
                    │  MongoDB       │
                    │  Kafka         │
                    │  Redis         │
                    │  Elasticsearch │
                    └────────────────┘
```

### Data Flow

1. **Client Request** → API Gateway
2. **Gateway** → Authentication/Authorization
3. **Authorized Request** → Target Service
4. **Service** → Database/Cache
5. **Response** ← Gateway ← Service

### Event-Driven Architecture

Services communicate via Kafka for:
- Asynchronous operations
- Event sourcing
- Message persistence
- Service decoupling

---

## 🗄️ Shared Infrastructure

### MongoDB

- **Purpose:** Primary data store
- **Setup:** Replica set with 1-3 nodes
- **Access:** Via mongodb-service abstraction layer
- **Port:** 27017

### Redis

- **Purpose:** Caching, session storage, pub/sub
- **Setup:** Single instance (clustered in production)
- **Port:** 6379

### Kafka

- **Purpose:** Event streaming, message queue
- **Setup:** 1-3 broker cluster with ZooKeeper
- **Ports:** 9092, 9093, 9094

### Elasticsearch

- **Purpose:** Full-text search, message indexing
- **Setup:** Single node (clustered in production)
- **Port:** 9200

---

## 📦 Development

### Service Template Structure

```
service-name/
├── src/
│   ├── config/          # Configuration & environment
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── index.ts         # Entry point
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── Dockerfile           # Docker image definition
├── .env.example         # Environment template
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # Service documentation
```

### Adding a New Service

1. Create service directory
2. Initialize Node.js project
3. Add TypeScript configuration
4. Implement service logic
5. Create Dockerfile
6. Add to docker-compose.yml
7. Document in README

---

## 🧪 Testing

### Unit Tests

```bash
cd services/service-name
npm test
```

### Integration Tests

```bash
# Start infrastructure
cd ../tasks
docker-compose up -d

# Run integration tests
cd ../services/service-name
npm run test:integration
```

### E2E Tests

```bash
# Start all services
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

---

## 🔒 Security

### Authentication

- JWT-based authentication
- API key validation
- Session management

### Authorization

- RBAC (Role-Based Access Control)
- ABAC (Attribute-Based Access Control)
- Tenant isolation

### Data Protection

- E2E encryption for messages
- TLS for transport
- Encrypted storage for sensitive data

---

## 📊 Monitoring

### Health Checks

Each service exposes:
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics

- Prometheus metrics at `/metrics`
- Custom business metrics
- Performance monitoring

### Logging

- Structured JSON logging
- Log levels: error, warn, info, debug
- Centralized log aggregation (Loki)

---

## 🚀 Deployment

### Docker Compose (Development)

```bash
cd tasks
docker-compose up -d
```

### Docker Compose (Production Profile)

```bash
docker-compose --profile multi-node --profile monitoring up -d
```

### Kubernetes (Production)

See `tasks/phases/phase-8-deployment/kubernetes/` for manifests.

---

## 🔧 Configuration

### Environment Variables

Each service has its own `.env` file. Common variables:

```env
NODE_ENV=development|production|test
LOG_LEVEL=error|warn|info|debug
PORT=3000
```

### Service Discovery

Services discover each other via:
- Docker network (development)
- Kubernetes DNS (production)
- Service mesh (optional)

---

## 📝 Documentation Standards

Each service README should include:

1. **Overview** - What the service does
2. **Quick Start** - How to run it
3. **Configuration** - Environment variables
4. **API Reference** - Endpoints and examples
5. **Database Schema** - Data models
6. **Testing** - How to test
7. **Deployment** - Docker/K8s instructions
8. **Troubleshooting** - Common issues

---

## 🛣️ Development Roadmap

### Phase 1: Infrastructure (Current)
- [x] MongoDB Service ✅
- [ ] Kafka Service
- [ ] API Gateway

### Phase 2: Security
- [ ] Authentication Service
- [ ] Authorization Service
- [ ] Encryption Service

### Phase 3: Real-Time
- [ ] Socket Service
- [ ] Presence Service
- [ ] Event Router

### Phase 4: Messaging
- [ ] Messaging Service
- [ ] Media Service
- [ ] Search Service

### Phase 5: Observability
- [ ] Logging Service
- [ ] Metrics Service
- [ ] Analytics Service

### Phase 6: Client
- [ ] Admin Portal
- [ ] Widget Server

### Phase 7: Billing
- [ ] Billing Service
- [ ] Payment Service

---

## 📞 Support

- Main Documentation: [../docs/](../docs/)
- Task System: [../tasks/](../tasks/)
- Docker Setup: [../local/SETUP_GUIDE.md](../local/SETUP_GUIDE.md)

---

**Last Updated:** 2026-01-27  
**Version:** 1.0.0
