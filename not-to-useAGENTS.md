# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CAAS (Chat-As-A-Service) is an enterprise-grade multi-tenant chat infrastructure platform for SAAS applications. It provides chat features (text, voice, video, file sharing, screen sharing, etc.) that SAAS applications can integrate via API, allowing them to focus on their core business logic.

**Key Context Files:**
- `docs/OVERVIEW.md` - Product vision and purpose
- `docs/PRIORITY_ROADMAP.md` - Development phases and task breakdown
- `roadmaps/` folder - Detailed implementation instructions with links to deepDive, rnd, and flowdiagrams

## Build and Run Commands

### Docker (Full Platform)
```powershell
# Start all services
.\start.ps1
# Or: docker compose up -d

# Stop all services
.\stop.ps1
# Or: docker compose down

# View logs
docker compose logs -f gateway

# Rebuild a specific service
docker compose up -d --build gateway
```

### Gateway Service (TypeScript/Fastify)
```powershell
cd services/gateway

# Development with hot reload
npm run dev

# Build
npm run build

# Production start
npm start

# Lint
npm run lint

# Format
npm run format
```

### Testing
```powershell
# Gateway unit tests (vitest)
cd services/gateway
npm test
npm run test:coverage

# System tests
.\tests\system\test-system.ps1

# Integration tests
.\tests\integration\test-kafka-phase1.ps1
```

### Infrastructure Verification
```powershell
# Test MongoDB connection
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026

# Test Kafka topics
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list

# Test Gateway health
curl http://localhost:3000/health

# Test Redis
docker compose exec redis redis-cli -a caas_redis_2026 ping
```

## Architecture

### Service Structure
```
services/
├── gateway/          # API Gateway (Fastify + TypeScript) - Port 3000
├── mongodb-service/  # MongoDB abstraction layer
├── kafka-service/    # Kafka client library
├── auth-service/     # Authentication service (Phase 2)
├── socket-service/   # WebSocket service (Phase 3)
├── messaging-service/# Message handling (Phase 4)
├── media-service/    # File upload/processing (Phase 4)
└── search-service/   # Elasticsearch integration (Phase 4)
```

### Gateway Request Flow
1. Request enters via Fastify
2. `loggingPlugin` - Request logging with correlation ID
3. `authPlugin` - JWT validation
4. `resolveTenant` - Multi-tenant context extraction
5. `authzMiddleware` - Authorization checks (currently permissive)
6. `rateLimitMiddleware` - Rate limiting
7. Route handler execution

### Infrastructure (Docker Compose)
- **MongoDB**: 3-node replica set (replica name: `caas-rs`)
- **Kafka**: 3-broker cluster with ZooKeeper
- **Redis**: Session/cache storage
- **Schema Registry**: Kafka schema management

### Network (172.28.0.0/16)
- MongoDB: 172.28.1.x
- Redis: 172.28.2.x
- Kafka/ZooKeeper: 172.28.3.x

## Key Patterns

### Multi-Tenancy
- Database-level isolation per tenant
- Tenant context extracted from JWT and bound to request
- All queries scoped by `tenant_id`

### Validation
- Zod schemas for request/response validation
- Type-safe with `fastify-type-provider-zod`

### Configuration
- Environment variables in `.env` (copy from `.env.example`)
- Service config loaded via `src/config/` with Zod validation

### Middleware Organization (Gateway)
```
src/middleware/
├── auth/           # JWT verification
├── authorization/  # ABAC/RBAC checks
├── error/          # Global error handler
├── logging/        # Request/response logging
├── rate-limit/     # Throttling
└── tenant/         # Tenant resolution
```

### API Versioning
- Routes under `src/routes/v1/` for versioned API
- Internal routes (health, metrics) under `src/routes/internal/`

## Kafka Topics
- `platform.events` - General platform events
- `platform.audit` - Audit trail
- `platform.notifications` - User notifications
- `internal.dlq` - Dead letter queue

## Access Points (Development)
- API Gateway: http://localhost:3000
- Swagger Docs: http://localhost:3000/docs
- Kafka UI: http://localhost:8080
- MongoDB Express: http://localhost:8082 (admin/admin123)
- Redis Commander: http://localhost:8083

## Development Notes

- Use `pnpm` or `npm` for package management
- TypeScript strict mode enabled
- ESM module system
- Always add `Co-Authored-By: Warp <agent@warp.dev>` to commit messages
