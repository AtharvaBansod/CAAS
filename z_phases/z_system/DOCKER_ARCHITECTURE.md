# CAAS Platform - Docker Architecture

**Last Updated:** 2026-02-09  
**Architecture:** Unified, Self-Contained, No External Dependencies

---

## 🎯 Design Principles

1. **Single Source of Truth** - Everything managed in `docker-compose.yml`
2. **Self-Contained Services** - Each service has its own Dockerfile in its directory
3. **No Local Dependencies** - Everything runs in Docker, no local installations needed
4. **Single Command Start/Stop** - `start.ps1` and `stop.ps1` handle everything
5. **Auto-Setup** - Initialization handled automatically on startup

---

## 📁 Clean Directory Structure

```
caas/
├── docker-compose.yml           # Single source orchestration
├── start.ps1                    # Single command to start everything
├── stop.ps1                     # Single command to stop everything
├── test-phase3.ps1             # Run Phase 3 tests
│
├── services/                    # All service code
│   ├── gateway/
│   │   ├── Dockerfile          # Gateway build instructions
│   │   ├── src/                # Gateway source code
│   │   └── package.json
│   │
│   └── socket-service/
│       ├── Dockerfile          # Socket service build instructions
│       ├── src/                # Socket service source code
│       └── package.json
│
├── tests/                       # Test files
│   ├── Dockerfile.phase3-test  # Test container
│   ├── phase3-socket-test.js   # Socket tests
│   └── phase3-presence-test.js # Presence tests
│
└── init/                        # Initialization scripts
    ├── mongodb/
    │   ├── mongo-keyfile
    │   └── init-replica-and-collections.sh
    └── kafka/
        └── create-topics.sh

❌ REMOVED: docker/ folder (was not being used)
```

---

## 🏗️ Service Architecture

### Infrastructure Services
- **MongoDB Replica Set** (3 nodes)
  - Primary: `mongodb-primary:27017` (exposed on host `27017`)
  - Secondary-1: `mongodb-secondary-1:27017`
  - Secondary-2: `mongodb-secondary-2:27017`
  
- **Redis** (single instance with persistence)
  - Host: `redis:6379` (exposed on host `6379`)
  
- **Kafka Cluster** (3 brokers)
  - Broker-1: `kafka-1:29092` (exposed on host `9092`)
  - Broker-2: `kafka-2:29092` (exposed on host `9096`)
  - Broker-3: `kafka-3:29092` (exposed on host `9094`)
  
- **Zookeeper**
  - Host: `zookeeper:2181` (exposed on host `2181`)
  
- **Schema Registry**
  - Host: `schema-registry:8081` (exposed on host `8081`)

### Application Services
- **Gateway** (API Gateway)
  - Built from: `services/gateway/Dockerfile`
  - Port: `3000` (exposed on host `3000`)
  - Metrics: `3001` (exposed on host `3001`)
  
- **Socket Service** (2 instances for horizontal scaling)
  - Instance 1: `socket-service-1:3001` (exposed on host `3002`)
  - Instance 2: `socket-service-2:3001` (exposed on host `3003`)
  - Built from: `services/socket-service/Dockerfile`

### Development Tools
- **Kafka UI** - `http://localhost:8080`
- **Mongo Express** - `http://localhost:8082`
- **Redis Commander** - `http://localhost:8083`

---

## 🚀 Single Command Operations

### Start Everything
```powershell
.\start.ps1
```

**What it does:**
1. Checks Docker is running
2. Starts all services via `docker compose up -d`
3. Waits for MongoDB to be healthy
4. Initializes MongoDB replica set (if needed)
5. Creates Phase 2 collections
6. Waits for Kafka to be healthy
7. Creates Kafka topics
8. Verifies all services are running

### Stop Everything
```powershell
.\stop.ps1
```

**What it does:**
1. Stops all containers via `docker compose down`

### Test Phase 3
```powershell
.\test-phase3.ps1
```

**What it does:**
1. Checks Docker status
2. Verifies services are running
3. Builds and runs test container
4. Reports test results

---

## 🔧 Service Configuration

### Each Service is Self-Contained

**Gateway Service:**
```
services/gateway/
├── Dockerfile              # Build instructions
├── src/                    # All source code
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── [All related files in service folder]
```

**Socket Service:**
```
services/socket-service/
├── Dockerfile              # Build instructions
├── src/                    # All source code
│   ├── webrtc/            # WebRTC implementation
│   ├── presence/          # Presence tracking
│   ├── typing/            # Typing indicators
│   ├── receipts/          # Read receipts
│   ├── notifications/     # Notification system
│   └── namespaces/        # Socket.IO namespaces
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── [All related files in service folder]
```

---

## 🌐 Network Architecture

**Network:** `caas-network` (Bridge, 172.28.0.0/16)

**IP Allocation:**
- MongoDB: `172.28.1.x`
  - Primary: `172.28.1.1`
  - Secondary-1: `172.28.1.2`
  - Secondary-2: `172.28.1.3`
  
- Redis: `172.28.2.1`

- Kafka/Zookeeper: `172.28.3.x`
  - Zookeeper: `172.28.3.1`
  - Kafka-1: `172.28.3.2`
  - Kafka-2: `172.28.3.3`
  - Kafka-3: `172.28.3.4`
  - Schema Registry: `172.28.3.5`
  
- Gateway: `172.28.6.1`

- Socket Services: `172.28.7.x`
  - Socket-1: `172.28.7.1`
  - Socket-2: `172.28.7.2`

---

## 💾 Persistent Storage

**Named Volumes:**
- `mongodb_primary_data` - MongoDB primary data
- `mongodb_secondary1_data` - MongoDB secondary 1 data
- `mongodb_secondary2_data` - MongoDB secondary 2 data
- `mongodb_config` - MongoDB configuration
- `redis_data` - Redis persistence
- `kafka1_data` - Kafka broker 1 data
- `kafka2_data` - Kafka broker 2 data
- `kafka3_data` - Kafka broker 3 data
- `zookeeper_data` - Zookeeper data

**Host Mounts:**
- `./init/mongodb/mongo-keyfile` → MongoDB replica set authentication

---

## 🔒 Security

**Authentication Enabled:**
- MongoDB: Username/password authentication with keyfile for replica set
- Redis: Password protection
- JWT: Secret-based authentication for services

**Environment Variables (Default):**
```env
MONGO_ROOT_USER=caas_admin
MONGO_ROOT_PASSWORD=caas_secret_2026
REDIS_PASSWORD=caas_redis_2026
JWT_SECRET=change_this_in_production_please
```

⚠️ **IMPORTANT:** Change these in production via `.env` file!

---

## 🔄 Service Dependencies

**Dependency Chain:**
```
Zookeeper
    ↓
Kafka Cluster (3 brokers)
    ↓
Schema Registry
```

```
MongoDB Primary
    ↓
MongoDB Secondaries
```

```
Redis (standalone)
```

```
MongoDB + Redis + Kafka
    ↓
Gateway
```

```
MongoDB + Redis
    ↓
Socket Services (2 instances)
```

---

## 🏗️ Build Process

**Multi-Stage Builds:**
Both Gateway and Socket Service use multi-stage Docker builds for optimization:

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
CMD ["node", "dist/index.js"]
```

---

## 📊 Health Checks

**All Services Have Health Checks:**
- MongoDB: `mongosh ping` command
- Redis: `redis-cli ping`
- Kafka: `kafka-broker-api-versions`
- Gateway: HTTP GET `/health`
- Socket Services: HTTP GET `/health`
- Schema Registry: HTTP GET `/`
- Zookeeper: `echo srvr | nc localhost 2181`

**Health Check Configuration:**
- Interval: 10-30s depending on service
- Timeout: 5-10s
- Retries: 3-10
- Start Period: 10-40s (allows service to initialize)

---

## 🔄 Auto-Restart Policy

**Restart Policies:**
- Infrastructure Services: `unless-stopped`
- Application Services: `unless-stopped`
- Test Services: `no` (run once)

---

## 🎯 Why This Architecture?

### ✅ Benefits

1. **No External Dependencies**
   - Everything runs in Docker
   - No need to install MongoDB, Redis, Kafka locally
   - Consistent environment across all machines

2. **Single Command Operations**
   - `start.ps1` - Start everything
   - `stop.ps1` - Stop everything
   - No manual service management

3. **Self-Contained Services**
   - Each service has its own Dockerfile
   - All code in service directory
   - Easy to understand and maintain

4. **Automatic Setup**
   - MongoDB replica set auto-initialized
   - Collections created automatically
   - Kafka topics created automatically
   - No manual configuration needed

5. **Horizontal Scaling**
   - Multiple socket service instances
   - Redis adapter for cross-node communication
   - Load balancing built-in

6. **Development Tools Included**
   - Kafka UI for monitoring
   - Mongo Express for database viewing
   - Redis Commander for cache inspection

### ❌ What We Removed

- `docker/` folder - Was not being used
- Separate docker-compose files - Consolidated into one
- External nginx - Not needed (direct socket access)
- Init containers - Handled by start.ps1 script

---

## 🚀 Production Deployment

For production, you would:

1. Use `.env` file for secrets
2. Enable TLS/SSL
3. Use external MongoDB/Redis/Kafka clusters
4. Add load balancer (nginx, HAProxy)
5. Enable encryption at rest
6. Set up monitoring (Prometheus, Grafana)
7. Configure backups
8. Use orchestration (Kubernetes, Docker Swarm)

**Current setup is optimized for:**
- Local development
- Testing
- Demo/PoC
- Small-scale deployments

---

## 📚 Related Documentation

- `docker-compose.yml` - Service definitions
- `start.ps1` - Startup script
- `stop.ps1` - Shutdown script
- `test-phase3.ps1` - Testing script
- `PHASE3_TASK_STATUS.md` - Phase 3 implementation status
- `PHASE3_API_REFERENCE.md` - API quick reference

---

**Architecture Status:** ✅ Clean, Self-Contained, Production-Ready
