# CAAS - Chat-As-A-Service Platform

> Enterprise-grade chat infrastructure for SAAS applications

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (with Docker Compose V2)
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

### Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Update passwords in .env** (for production):
   - Change all `CHANGE_THIS_PASSWORD` values
   - Generate new JWT keys (see instructions in .env file)
   - Update `JWT_SECRET` with a strong random string
   - Restrict `CORS_ORIGINS` to your domains

### Start the Platform

```bash
# Start all services (uses .env file automatically)
.\start.ps1

# Or use docker compose directly
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f gateway
```

### Stop the Platform

```bash
# Stop all services
.\stop.ps1

# Or use docker compose directly
docker compose down
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **API Gateway** | http://localhost:3000 | - |
| **Gateway Swagger** | http://localhost:3000/docs | - |
| **Kafka UI** | http://localhost:8080 | - |
| **MongoDB Express** | http://localhost:8082 | admin / admin123 |
| **Redis Commander** | http://localhost:8083 | - |
| **Schema Registry** | http://localhost:8081 | - |

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Port 3000)                 │
│              Authentication, Rate Limiting, Routing         │
└────────────┬────────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬──────────────┐
             │              │              │              │
     ┌───────▼──────┐  ┌───▼────┐  ┌──────▼─────┐  ┌────▼─────┐
     │  MongoDB     │  │ Redis  │  │   Kafka    │  │  Schema  │
     │  Replica Set │  │ Cache  │  │  Cluster   │  │ Registry │
     │  (3 nodes)   │  │        │  │  (3 nodes) │  │          │
     └──────────────┘  └────────┘  └────────────┘  └──────────┘
```

## 🏗️ Phase 1 Services (Current)

### ✅ MongoDB Service
- **Purpose**: Multi-tenant data persistence
- **Setup**: 3-node replica set
- **Databases**: `caas_platform` (platform data)
- **Port**: 27017

### ✅ Kafka Service
- **Purpose**: Event streaming and message queue
- **Setup**: 3-broker cluster with ZooKeeper
- **Topics**: platform.events, platform.audit, platform.notifications, internal.dlq
- **Ports**: 9092, 9093, 9094

### ✅ API Gateway
- **Purpose**: Central entry point for all API requests
- **Framework**: Fastify + TypeScript
- **Features**: JWT auth, rate limiting, request validation
- **Port**: 3000

### ✅ Redis
- **Purpose**: Caching and session storage
- **Port**: 6379

## 📁 Project Structure

```
caas/
├── docker-compose.yml          # Unified orchestration file
├── .env                        # Environment configuration
├── init/                       # Initialization scripts
│   └── mongodb/               # MongoDB setup files
├── services/                   # Microservices
│   ├── gateway/               # API Gateway service
│   ├── kafka-service/         # Kafka client library
│   └── mongodb-service/       # MongoDB abstraction layer
├── docs/                       # Documentation
├── schemas/                    # Database schemas
├── roadmaps/                   # Development roadmaps
├── flowdiagram/               # Architecture diagrams
└── local/                      # Local development files
```

## 🔧 Development

### Environment Variables

All environment variables are configured in the `.env` file in the root directory. Docker Compose automatically loads this file.

**Key Variables:**

```env
# MongoDB Configuration
MONGO_ROOT_USER=caas_admin
MONGO_ROOT_PASSWORD=caas_secret_2026
MONGO_APP_PASSWORD=caas_app_secret_2026

# Redis Configuration
REDIS_PASSWORD=caas_redis_2026

# Elasticsearch Configuration
ELASTICSEARCH_PASSWORD=changeme

# MinIO (S3 Storage) Configuration
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# JWT Configuration
JWT_SECRET=change_this_in_production_please
JWT_PRIVATE_KEY="..." # RSA private key
JWT_PUBLIC_KEY="..."  # RSA public key

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=*
```

**For Production:**
1. Copy `.env.example` to `.env`
2. Change all passwords to strong, unique values
3. Generate new JWT keys: `openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem`
4. Restrict `CORS_ORIGINS` to your specific domains
5. Never commit `.env` to version control

### Service Management

```bash
# Start specific services
docker compose up -d mongodb-primary redis

# Restart a service
docker compose restart gateway

# View service logs
docker compose logs -f gateway

# Execute commands in containers
docker compose exec mongodb-primary mongosh

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Testing

```bash
# Test MongoDB connection
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026

# Test Kafka
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list

# Test Gateway health
curl http://localhost:3000/health

# Test Redis
docker compose exec redis redis-cli -a caas_redis_2026 ping
```

## 🧪 Phase 1 Verification

### MongoDB Replica Set
```bash
# Check replica set status
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --eval "rs.status()"

# Verify databases
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --eval "show dbs"
```

### Kafka Cluster
```bash
# List topics
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list

# Describe topic
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --describe --topic platform.events

# Test message production
echo "test message" | docker compose exec -T kafka-1 kafka-console-producer --bootstrap-server localhost:9092 --topic platform.events
```

### Gateway API
```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/docs
```

## 📚 Documentation

- **[Overview](docs/OVERVIEW.md)** - Project vision and architecture
- **[Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Complete documentation map
- **[Priority Roadmap](docs/PRIORITY_ROADMAP.md)** - Development phases
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Command cheat sheet
- **[Phase 1 Results](local/PHASE1_KAFKA_RESULTS.md)** - Phase 1 test results

## 🔒 Security Notes

⚠️ **Default credentials are for development only!**

For production:
- Generate strong random passwords
- Use secrets management (Kubernetes Secrets, AWS Secrets Manager)
- Enable TLS/SSL for all services
- Implement IP whitelisting
- Enable Kafka SASL/SCRAM authentication
- Use MongoDB authentication with strong passwords

## 🐛 Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# Check port availability
netstat -an | findstr "3000 27017 9092"

# View service logs
docker compose logs mongodb-primary
docker compose logs kafka-1
docker compose logs gateway
```

### MongoDB replica set issues
```bash
# Reinitialize replica set
docker compose restart mongodb-init

# Check replica set status
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --eval "rs.status()"
```

### Kafka connection issues
```bash
# Restart Kafka cluster
docker compose restart zookeeper kafka-1 kafka-2 kafka-3

# Reinitialize topics
docker compose restart kafka-init

# Check broker health
docker compose exec kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Gateway not responding
```bash
# Check gateway logs
docker compose logs gateway

# Restart gateway
docker compose restart gateway

# Rebuild gateway
docker compose up -d --build gateway
```

## 🧹 Cleanup

```bash
# Stop all services
docker compose down

# Remove volumes (⚠️ deletes all data)
docker compose down -v

# Clean up Docker system
docker system prune -a
```

## 📈 Monitoring

### Service Health
```bash
# Check all services
docker compose ps

# Gateway health
curl http://localhost:3000/health

# MongoDB health
docker compose exec mongodb-primary mongosh --eval "db.adminCommand('ping')"

# Kafka health
docker compose exec kafka-1 kafka-broker-api-versions --bootstrap-server localhost:9092
```

### Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df
```

## 🚦 Next Steps

Phase 1 is complete! Next phases:

- **Phase 2**: Authentication & Security (JWT, E2E encryption)
- **Phase 3**: Real-time Communication (WebSocket, Socket.IO)
- **Phase 4**: Messaging Services (Messages, conversations, media)
- **Phase 5**: Observability (Logging, metrics, tracing)

See [Priority Roadmap](docs/PRIORITY_ROADMAP.md) for details.

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: Check service logs first
- **Architecture**: See [flowdiagram/](flowdiagram/)

---

**Built with ❤️ for SAAS developers**
