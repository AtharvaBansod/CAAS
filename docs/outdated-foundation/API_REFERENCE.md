# CAAS Phase 1 - API Reference & Endpoints

**Last Updated:** 2026-02-04

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Gateway API** | http://localhost:3000 | Main API endpoint |
| **Gateway Docs (Swagger)** | http://localhost:3000/documentation | Interactive API docs |
| **Gateway Health** | http://localhost:3000/health | Health check |
| **Gateway Metrics** | http://localhost:3001 | Prometheus metrics |
| **Kafka UI** | http://localhost:8080 | Kafka management |
| **MongoDB Express** | http://localhost:8082 | MongoDB viewer (admin/admin123) |
| **Redis Commander** | http://localhost:8083 | Redis viewer |
| **Schema Registry** | http://localhost:8081 | Kafka schemas |

---

## 📡 Gateway API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/internal/health` | Detailed health with dependencies |
| GET | `/internal/ready` | Readiness probe |
| GET | `/internal/live` | Liveness probe |
| GET | `/internal/metrics` | Prometheus metrics |

**Example:**
```bash
# Health check
curl http://localhost:3000/health

# Response
{"status":"ok","timestamp":"2026-02-04T14:09:55.368Z"}
```

### API Version v1

#### Authentication (`/v1/auth/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Register new SAAS client |
| POST | `/v1/auth/login` | SAAS client login |
| POST | `/v1/auth/token/refresh` | Refresh access token |
| POST | `/v1/auth/logout` | Revoke tokens |
| GET | `/v1/auth/me` | Get current client info |

#### Tenant Management (`/v1/tenant/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/tenant/info` | Get current tenant info |
| PUT | `/v1/tenant/settings` | Update tenant settings |

#### Webhooks (`/v1/webhooks/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/webhooks/register` | Register webhook endpoint |
| GET | `/v1/webhooks` | List registered webhooks |
| DELETE | `/v1/webhooks/:id` | Delete webhook |
| POST | `/v1/webhooks/test` | Test webhook delivery |

### API Versioning

The API supports versioning through:
1. **URL Path**: `/v1/endpoint` (recommended)
2. **Header**: `X-API-Version: v1`
3. **Query**: `?api-version=v1`

---

## 🔧 Docker Commands Quick Reference

### Start/Stop

```powershell
# Start all services (single command)
.\start.ps1

# Stop all services (single command)
.\stop.ps1

# Or using docker compose directly
docker compose up -d       # Start
docker compose down        # Stop
docker compose down -v     # Stop and remove volumes
```

### Service Management

```powershell
# View all container status
docker compose ps

# View logs
docker compose logs -f gateway        # Follow gateway logs
docker compose logs --tail 100 kafka-1   # Last 100 lines

# Restart specific service
docker compose restart gateway

# Rebuild gateway (after code changes)
docker compose up -d --build gateway
```

### Health Checks via Docker

```powershell
# Gateway health (inside container)
docker exec caas-gateway sh -c "wget -qO- http://127.0.0.1:3000/health"

# MongoDB replica status
docker exec caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin --eval "rs.status().members.map(m => ({name: m.name, state: m.stateStr}))"

# Kafka topic list
docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --list

# Redis ping
docker exec caas-redis redis-cli -a caas_redis_2026 ping
```

---

## 📊 Kafka Topics

| Topic | Partitions | Replication | Purpose |
|-------|------------|-------------|---------|
| `platform.events` | 3 | 3 | General platform events |
| `platform.audit` | 3 | 3 | Audit trail (30-day retention) |
| `platform.notifications` | 3 | 3 | Notification delivery |
| `internal.dlq` | 3 | 3 | Dead letter queue |
| `events` | 3 | 1 | Webhook consumer events |

### Kafka Operations

```powershell
# Produce message
docker exec -it caas-kafka-1 kafka-console-producer --bootstrap-server kafka-1:29092 --topic platform.events

# Consume messages
docker exec caas-kafka-1 kafka-console-consumer --bootstrap-server kafka-1:29092 --topic platform.events --from-beginning --max-messages 10

# Describe topic
docker exec caas-kafka-1 kafka-topics --bootstrap-server kafka-1:29092 --describe --topic platform.events
```

---

## 🗄️ MongoDB

### Connection String

```
mongodb://caas_admin:caas_secret_2026@localhost:27017/?authSource=admin&replicaSet=caas-rs
```

### Databases

| Database | Purpose |
|----------|---------|
| `caas_platform` | Platform-wide data (clients, apps, keys) |
| `tenant_<id>` | Per-tenant isolated data |

### Collections (caas_platform)

| Collection | Description |
|------------|-------------|
| `saas_clients` | Registered SAAS client applications |
| `applications` | Application configurations |
| `api_keys` | API key registry |
| `platform_admins` | Admin user accounts |

### MongoDB Operations

```powershell
# Connect via mongosh
docker exec -it caas-mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin

# In mongosh:
use caas_platform
show collections
db.saas_clients.find()
```

---

## 🔴 Redis

### Connection

```
redis://:caas_redis_2026@localhost:6379
```

### Key Patterns

| Pattern | Purpose |
|---------|---------|
| `session:<id>` | User sessions |
| `rate:<ip>` | Rate limiting counters |
| `cache:<key>` | General cache |
| `temp:<key>` | Temporary data with TTL |

### Redis Operations

```powershell
# Connect
docker exec -it caas-redis redis-cli -a caas_redis_2026

# In redis-cli:
KEYS *
GET key_name
SET test "hello"
TTL key_name
```

---

## 🔒 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        SAAS Client                               │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. POST /v1/auth/login                                          │
│     Body: { clientId, clientSecret }                            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Gateway validates credentials against MongoDB                   │
│  Returns: { accessToken, refreshToken, expiresIn }              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Subsequent requests include:                                 │
│     Header: Authorization: Bearer <accessToken>                  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Gateway validates JWT, resolves tenant, applies rate limits    │
│  Routes to appropriate service                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Gateway Unhealthy
```powershell
# Check logs
docker logs caas-gateway --tail 50

# Restart
docker compose restart gateway

# Rebuild
docker compose up -d --build gateway
```

### MongoDB Connection Issues
```powershell
# Check replica set status
docker exec caas-mongodb-primary mongosh --eval "rs.status()"

# Restart init
docker compose restart mongodb-init
```

### Kafka Broker Issues
```powershell
# Check broker status
docker exec caas-kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092

# Check zookeeper
docker logs caas-zookeeper
```
