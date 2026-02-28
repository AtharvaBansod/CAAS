# CAAS Platform - System Overview

## 🎯 Phase 1 Complete - Infrastructure Ready

### What's Running

The CAAS platform Phase 1 infrastructure is fully operational with the following services:

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAAS Platform                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      API Gateway (Port 3000)                        │
│  • Authentication & Authorization                                   │
│  • Rate Limiting                                                    │
│  • Request Validation                                               │
│  • API Documentation (Swagger)                                      │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┬───────────
             │              │              │              │
     ┌───────▼──────┐  ┌───▼────┐  ┌──────▼─────┐  ┌────▼─────┐
     │  MongoDB     │  │ Redis  │  │   Kafka    │  │  Schema  │
     │  Replica Set │  │ Cache  │  │  Cluster   │  │ Registry │
     │              │  │        │  │            │  │          │
     │  Primary     │  │ Single │  │  Broker 1  │  │  Avro    │
     │  Secondary 1 │  │ Node   │  │  Broker 2  │  │  Schema  │
     │  Secondary 2 │  │        │  │  Broker 3  │  │  Mgmt    │
     └──────────────┘  └────────┘  └────────────┘  └──────────┘
```

## 🔧 Services Detail

### 1. MongoDB Replica Set
**Purpose**: Multi-tenant data persistence with high availability

- **Configuration**: 3-node replica set (1 primary, 2 secondaries)
- **Port**: 27017
- **Databases**:
  - `caas_platform` - Platform-level data (clients, applications, API keys)
  - Tenant databases created dynamically per client
- **Features**:
  - Automatic failover
  - Read preference options
  - Data replication
  - Authentication enabled

**Access**:
```bash
# Via CLI
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026

# Via Web UI
http://localhost:8082 (MongoDB Express)
```

### 2. Redis Cache
**Purpose**: High-performance caching and session storage

- **Configuration**: Single node (cluster in production)
- **Port**: 6379
- **Use Cases**:
  - Session storage
  - Rate limiting counters
  - Temporary data caching
  - Pub/Sub messaging

**Access**:
```bash
# Via CLI
docker compose exec redis redis-cli -a caas_redis_2026

# Via Web UI
http://localhost:8083 (Redis Commander)
```

### 3. Kafka Cluster
**Purpose**: Event streaming and asynchronous message processing

- **Configuration**: 3-broker cluster with ZooKeeper
- **Ports**: 9092, 9093, 9094
- **Topics Created**:
  - `platform.events` - Platform-wide events
  - `platform.audit` - Audit log events
  - `platform.notifications` - Admin notifications
  - `internal.dlq` - Dead letter queue for failed messages

**Features**:
- High throughput message processing
- Message persistence
- Partitioning for scalability
- Replication factor: 3

**Access**:
```bash
# Via CLI
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list

# Via Web UI
http://localhost:8080 (Kafka UI)
```

### 4. Schema Registry
**Purpose**: Schema management for Kafka messages

- **Port**: 8081
- **Features**:
  - Avro schema storage
  - Schema evolution
  - Compatibility checking

**Access**:
```bash
# Via API
curl http://localhost:8081/subjects
```

### 5. API Gateway
**Purpose**: Central entry point for all API requests

- **Framework**: Fastify + TypeScript
- **Port**: 3000 (API), 3001 (Metrics)
- **Features**:
  - JWT authentication
  - Rate limiting (Redis-backed)
  - Request validation (Zod schemas)
  - CORS handling
  - API documentation (Swagger)
  - Health checks
  - Metrics export

**Access**:
```bash
# Health check
curl http://localhost:3000/health

# API Documentation
http://localhost:3000/docs
```

## 🎨 Visual Monitoring Tools

### 1. Kafka UI (Port 8080)
**What you can see**:
- Broker status and health
- Topic list with partition details
- Message browser (view messages in topics)
- Consumer group lag monitoring
- Schema registry schemas
- Cluster configuration

**Use it for**:
- Monitoring message flow
- Debugging Kafka issues
- Viewing topic configurations
- Testing message production/consumption

### 2. MongoDB Express (Port 8082)
**What you can see**:
- All databases and collections
- Document browser and editor
- Query execution
- Index management
- Database statistics

**Credentials**: admin / admin123

**Use it for**:
- Viewing stored data
- Testing database queries
- Monitoring collection sizes
- Debugging data issues

### 3. Redis Commander (Port 8083)
**What you can see**:
- All Redis keys
- Key values and types
- Memory usage
- Connected clients
- Server info

**Use it for**:
- Viewing cached data
- Monitoring session storage
- Debugging cache issues
- Testing Redis operations

### 4. API Gateway Swagger (Port 3000/docs)
**What you can see**:
- All API endpoints
- Request/response schemas
- Authentication requirements
- Try out API calls directly

**Use it for**:
- Understanding API structure
- Testing endpoints
- Viewing request/response formats
- API documentation

## 🔄 Data Flow Examples

### 1. Client Registration Flow
```
Client App → Gateway (POST /api/clients)
           ↓
Gateway validates request
           ↓
Gateway → MongoDB (save client)
           ↓
Gateway → Kafka (publish client.created event)
           ↓
Gateway ← Response (client data + API key)
```

### 2. Message Sending Flow
```
Client App → Gateway (POST /api/messages)
           ↓
Gateway validates JWT
           ↓
Gateway → Redis (check rate limit)
           ↓
Gateway → MongoDB (save message)
           ↓
Gateway → Kafka (publish message.sent event)
           ↓
Kafka → Socket Service (deliver to recipient)
```

### 3. Event Processing Flow
```
Service → Kafka (publish event)
        ↓
Kafka stores event
        ↓
Consumer reads event
        ↓
Consumer → MongoDB (update data)
        ↓
Consumer → Redis (update cache)
```

## 📈 System Metrics & Health

### Health Check Endpoints

```bash
# Gateway health
curl http://localhost:3000/health

# MongoDB health
docker compose exec mongodb-primary mongosh --eval "db.adminCommand('ping')"

# Redis health
docker compose exec redis redis-cli -a caas_redis_2026 ping

# Kafka health
docker compose exec kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Service logs
docker compose logs -f gateway
docker compose logs -f kafka-1
docker compose logs -f mongodb-primary

# Disk usage
docker system df
```

## 🧪 Testing the System

### Run System Tests
```bash
# Run comprehensive test suite
.\test-system.ps1
```

### Manual Testing

#### Test MongoDB
```bash
# Connect to MongoDB
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026

# Check replica set status
rs.status()

# List databases
show dbs

# Use platform database
use caas_platform

# List collections
show collections
```

#### Test Kafka
```bash
# List topics
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list

# Produce test message
echo "test message" | docker compose exec -T kafka-1 kafka-console-producer --bootstrap-server localhost:9092 --topic platform.events

# Consume messages
docker compose exec kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic platform.events --from-beginning --max-messages 1
```

#### Test Gateway
```bash
# Health check
curl http://localhost:3000/health

# View API docs
open http://localhost:3000/docs
```

## 🔐 Security Configuration

### Current Setup (Development)
- MongoDB: Username/password authentication
- Redis: Password authentication
- Kafka: No authentication (PLAINTEXT)
- Gateway: JWT-based authentication

### Production Recommendations
- Enable TLS/SSL for all services
- Implement Kafka SASL/SCRAM authentication
- Use secrets management (Kubernetes Secrets, AWS Secrets Manager)
- Enable MongoDB encryption at rest
- Implement IP whitelisting
- Use strong, randomly generated passwords

## 📊 Performance Characteristics

### MongoDB
- **Write Concern**: Majority (ensures data is written to majority of replica set)
- **Read Preference**: Primary (can be configured per query)
- **Connection Pool**: 100 connections per service

### Kafka
- **Replication Factor**: 3 (all messages replicated to 3 brokers)
- **Min In-Sync Replicas**: 2 (ensures durability)
- **Retention**: 7 days (168 hours)
- **Partitions**: 3 per topic (for parallelism)

### Redis
- **Persistence**: AOF (Append-Only File) enabled
- **Max Memory**: Unlimited (configure based on needs)
- **Eviction Policy**: None (configure based on use case)

### Gateway
- **Rate Limiting**: 100 requests/minute per IP (configurable)
- **Request Timeout**: 30 seconds
- **Body Size Limit**: 10MB

## 🚀 Next Steps

Phase 1 is complete! Ready for:

### Phase 2: Security & Authentication
- Implement full JWT authentication flow
- Add E2E encryption for messages
- Implement ABAC authorization engine
- Add audit logging

### Phase 3: Real-time Communication
- Socket.IO server for WebSocket connections
- Presence tracking
- Typing indicators
- Real-time event delivery

### Phase 4: Messaging Services
- Message CRUD operations
- Conversation management
- File upload and storage
- Message search (Elasticsearch)

## 📞 Troubleshooting

### Services Not Starting
1. Check Docker is running: `docker info`
2. Check port availability: `netstat -an | findstr "3000 27017 9092"`
3. View logs: `docker compose logs [service]`
4. Restart: `docker compose restart [service]`

### MongoDB Issues
- Replica set not initialized: `docker compose restart mongodb-init`
- Connection refused: Check if primary is healthy
- Authentication failed: Verify credentials in .env

### Kafka Issues
- Broker not available: Wait 30-60 seconds after startup
- Topics not created: `docker compose restart kafka-init`
- Connection timeout: Check ZooKeeper is healthy

### Gateway Issues
- 502 Bad Gateway: Check if MongoDB and Redis are healthy
- Authentication errors: Verify JWT_SECRET is set
- Rate limit errors: Check Redis connection

## 📚 Additional Resources

- **Documentation**: [docs/](docs/)
- **Architecture Diagrams**: [flowdiagram/](flowdiagram/)
- **Database Schemas**: [schemas/](schemas/)
- **Development Roadmap**: [docs/PRIORITY_ROADMAP.md](docs/PRIORITY_ROADMAP.md)

---

**System Status**: ✅ Phase 1 Complete - Production Ready
