# ============================================================
# CAAS Docker Compose Configuration Guide
# ============================================================

## Quick Start

### 1. For Testing (Single Node - Low Load)
```bash
# Copy environment template
cp .env.example .env

# Edit .env and set:
MONGO_REPLICA_COUNT=1
KAFKA_BROKER_COUNT=1

# Start MongoDB only (single node)
docker-compose up -d mongodb-primary redis

# Initialize database (users and collections)
docker-compose --profile tools up mongodb-init
```

### 2. For Production-like Setup (3-Node Replica Set)
```bash
# Edit .env and set:
MONGO_REPLICA_COUNT=3
KAFKA_BROKER_COUNT=3

# Start with multi-node profile
docker-compose --profile multi-node up -d

# Initialize replica set
docker-compose --profile tools up mongodb-init
```

## Configuration Variables

### MongoDB Configuration
- `MONGO_REPLICA_COUNT`: Number of MongoDB replica nodes (1, 2, or 3)
  - 1 = Single node for testing (no replica set)
  - 2 = Primary + 1 Secondary
  - 3 = Primary + 2 Secondaries (recommended for production)

- `MONGO_REPLICA_SET_NAME`: Replica set name (default: caas-rs)
- `MONGO_ROOT_USER`: MongoDB admin username
- `MONGO_ROOT_PASSWORD`: MongoDB admin password
- `MONGO_APP_USER`: Application user for services
- `MONGO_APP_PASSWORD`: Application user password
- `MONGO_DATABASE`: Main database name (default: caas_platform)

### Kafka Configuration
- `KAFKA_BROKER_COUNT`: Number of Kafka brokers (1 or 3)

## Docker Compose Profiles

The docker-compose.yml uses profiles to enable/disable services:

1. **Default Profile** (no --profile flag)
   - mongodb-primary (always runs)
   - redis
   - zookeeper
   - kafka-1
   - schema-registry
   - kafka-ui

2. **multi-node Profile**
   - Adds: mongodb-secondary-1, mongodb-secondary-2
   - Adds: kafka-2, kafka-3
   
   ```bash
   docker-compose --profile multi-node up -d
   ```

3. **tools Profile**
   - Adds: mongodb-init (one-time initialization)
   - Adds: mongo-express (MongoDB web UI)
   - Adds: redis-commander (Redis web UI)
   - Adds: mailhog (Email testing)
   
   ```bash
   docker-compose --profile tools up -d
   ```

4. **monitoring Profile**
   - Adds: prometheus, grafana, loki, jaeger
   
   ```bash
   docker-compose --profile monitoring up -d
   ```

5. **search Profile**
   - Adds: elasticsearch
   
   ```bash
   docker-compose --profile search up -d
   ```

## Common Commands

### Start Services

```bash
# Single-node testing mode
docker-compose up -d

# Multi-node production mode
docker-compose --profile multi-node up -d

# With monitoring tools
docker-compose --profile multi-node --profile monitoring up -d

# Everything
docker-compose --profile multi-node --profile tools --profile monitoring --profile search up -d
```

### Initialize MongoDB

```bash
# After starting MongoDB services, run initialization
docker-compose --profile tools up mongodb-init

# Check initialization logs
docker logs caas-mongodb-init
```

### Check Service Health

```bash
# Check all services
docker-compose ps

# Check MongoDB replica set status (for multi-node)
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 --authenticationDatabase admin \
  --eval "rs.status()"

# Check MongoDB single-node status
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 --authenticationDatabase admin \
  --eval "db.adminCommand({ serverStatus: 1 })"
```

### Stop Services

```bash
# Stop all
docker-compose down

# Stop and remove volumes (DELETES ALL DATA)
docker-compose down -v
```

## Port Mappings

| Service | Port | Description |
|---------|------|-------------|
| MongoDB Primary | 27017 | MongoDB connection |
| Redis | 6379 | Redis connection |
| Kafka-1 | 9092 | Kafka broker |
| Kafka-2 | 9093 | Kafka broker (multi-node) |
| Kafka-3 | 9094 | Kafka broker (multi-node) |
| Schema Registry | 8081 | Kafka Schema Registry |
| Kafka UI | 8080 | Kafka web interface |
| Mongo Express | 8082 | MongoDB web UI |
| Redis Commander | 8083 | Redis web UI |
| Mailhog Web | 8025 | Email testing UI |
| Mailhog SMTP | 1025 | SMTP server |
| Grafana | 3001 | Monitoring dashboards |
| Prometheus | 9090 | Metrics collection |
| Loki | 3100 | Log aggregation |
| Jaeger | 16686 | Distributed tracing |
| Elasticsearch | 9200 | Search engine |

## Network Architecture

All services run in the `caas-network` bridge network with subnet 172.28.0.0/16:

- MongoDB: 172.28.1.x
- Redis: 172.28.2.x
- Kafka/ZooKeeper: 172.28.3.x
- Observability: 172.28.4.x
- Search: 172.28.5.x

## Volume Management

### Named Volumes
- `mongodb_primary_data`: Primary node data
- `mongodb_secondary1_data`: Secondary node 1 data
- `mongodb_secondary2_data`: Secondary node 2 data
- `redis_data`: Redis persistence
- `kafka_data`: Kafka logs
- `zookeeper_data`: ZooKeeper data

### Backup Volumes

```bash
# Backup MongoDB data
docker run --rm -v mongodb_primary_data:/data -v $(pwd)/backup:/backup \
  ubuntu tar czf /backup/mongodb-backup-$(date +%Y%m%d).tar.gz /data

# Restore MongoDB data
docker run --rm -v mongodb_primary_data:/data -v $(pwd)/backup:/backup \
  ubuntu tar xzf /backup/mongodb-backup-YYYYMMDD.tar.gz -C /
```

## Troubleshooting

### MongoDB Replica Set Issues

```bash
# Check replica set configuration
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 --authenticationDatabase admin \
  --eval "rs.conf()"

# Force reconfigure replica set
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 --authenticationDatabase admin \
  --eval "rs.reconfig(config, {force: true})"
```

### MongoDB Connection Issues

```bash
# Test connection from host
mongosh "mongodb://caas_admin:caas_secret_2026@localhost:27017/admin"

# Test application user
mongosh "mongodb://caas_app:caas_app_secret_2026@localhost:27017/caas_platform"
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f caas-mongodb-primary
docker logs -f caas-kafka-1
```

### Reset Everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all stopped containers
docker container prune -f

# Remove all unused volumes
docker volume prune -f

# Start fresh
docker-compose up -d
```

## Security Notes

1. **Change default passwords** in `.env` before production use
2. **MongoDB keyfile** is auto-generated and has proper permissions
3. **TLS/SSL** should be enabled for production (requires additional configuration)
4. **Network isolation** uses Docker bridge network with specific subnet
5. **IP whitelisting** should be configured for production environments

## Next Steps

After infrastructure is running:
1. Deploy MongoDB Service (services/mongodb-service)
2. Deploy Gateway Service (services/gateway)
3. Deploy Auth Service (services/auth)
4. Deploy Socket Service (services/socket)

See `services/README.md` for service-specific documentation.
