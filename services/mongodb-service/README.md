# MongoDB Service

> **CAAS Platform - Database Service Layer**  
> Multi-tenant MongoDB service with connection management, health checks, and tenant isolation

---

## 📋 Overview

The MongoDB Service provides a robust database abstraction layer for the CAAS platform with built-in support for:
- ✅ Multi-tenancy with data isolation
- ✅ Connection pooling and management
- ✅ Health monitoring
- ✅ Automatic reconnection with exponential backoff
- ✅ Environment-based configuration
- ✅ TypeScript type safety

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- MongoDB 7.0+ running (see [Docker Setup](#docker-setup))
- TypeScript knowledge

### Installation

```bash
cd services/mongodb-service
npm install
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your MongoDB connection details:
```env
MONGODB_URI=mongodb://caas_app:caas_app_secret_2026@localhost:27017/caas_platform?authSource=admin
MONGODB_DATABASE=caas_platform
```

### Run

```bash
# Development mode with hot reload
npm run dev

# Build
npm run build

# Production
npm start

# Tests
npm test
```

---

## 🐳 Docker Setup

### Option 1: Single Node (Testing/Development)

```bash
# Navigate to local directory
cd ../../local

# Copy environment file
cp .env.example .env

# Edit .env and set
# MONGO_REPLICA_COUNT=1

# Start MongoDB
docker-compose up -d mongodb-primary

# Initialize database (creates users and databases)
docker-compose --profile tools up mongodb-init

# Verify MongoDB is running
docker ps | grep mongodb
```

**Connection URI for single-node:**
```
mongodb://caas_app:caas_app_secret_2026@localhost:27017/caas_platform?authSource=admin
```

### Option 2: Replica Set (Production-like)

```bash
# Edit .env and set
# MONGO_REPLICA_COUNT=3

# Start MongoDB cluster
docker-compose --profile multi-node up -d

# Initialize replica set
docker-compose --profile tools up mongodb-init

# Check replica set status
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 --authenticationDatabase admin \
  --eval "rs.status()"
```

**Connection URI for replica set:**
```
mongodb://caas_app:caas_app_secret_2026@localhost:27017,localhost:27018,localhost:27019/caas_platform?replicaSet=caas-rs&authSource=admin
```

### Access MongoDB Web UI

```bash
# Start Mongo Express (Web UI)
docker-compose --profile tools up -d mongo-express

# Open browser to http://localhost:8082
# Username: admin
# Password: admin123
```

---

## 📚 Usage Examples

### Basic Connection

```typescript
import { getConnectionManager, createHealthCheck } from '@caas/mongodb-service';

async function main() {
  // Get connection manager
  const manager = getConnectionManager();
  
  try {
    // Connect to MongoDB
    const connection = await manager.connect();
    console.log('Connected to:', connection.name);
    
    // Perform health check
    const healthCheck = createHealthCheck();
    const health = await healthCheck.check();
    console.log('Health status:', health);
    
    // Use connection for queries
    const users = await connection.collection('users').find({}).toArray();
    console.log('Users:', users.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Graceful shutdown
    await manager.gracefulShutdown();
  }
}

main();
```

### Connection Events

```typescript
import { getConnectionManager } from '@caas/mongodb-service';

const manager = getConnectionManager();

// Listen to connection events
manager.on('connected', () => {
  console.log('✓ Database connected');
});

manager.on('disconnected', () => {
  console.warn('⚠ Database disconnected');
});

manager.on('reconnecting', () => {
  console.log('🔄 Attempting to reconnect...');
});

manager.on('reconnected', () => {
  console.log('✓ Database reconnected');
});

manager.on('error', (error) => {
  console.error('✗ Database error:', error);
});

await manager.connect();
```

### Health Monitoring

```typescript
import { createHealthCheck } from '@caas/mongodb-service';

const healthCheck = createHealthCheck();

// Simple health check
const health = await healthCheck.check();
console.log('Healthy:', health.healthy);
console.log('Latency:', health.latency, 'ms');
console.log('Details:', health.details);

// Get database statistics
const stats = await healthCheck.getStats();
console.log('Database size:', stats.dataSize);
console.log('Collections:', stats.collections);
console.log('Indexes:', stats.indexes);

// Check replica set status (if applicable)
const rsStatus = await healthCheck.checkReplicaSet();
if (rsStatus) {
  console.log('Replica set members:', rsStatus.members.length);
}
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | - | ✅ |
| `MONGODB_DATABASE` | Default database name | `caas_platform` | ✅ |
| `MONGODB_MIN_POOL_SIZE` | Minimum connection pool size | `10` | ❌ |
| `MONGODB_MAX_POOL_SIZE` | Maximum connection pool size | `100` | ❌ |
| `MONGODB_MAX_IDLE_TIME_MS` | Max idle time for connections | `30000` | ❌ |
| `MONGODB_WAIT_QUEUE_TIMEOUT_MS` | Wait queue timeout | `10000` | ❌ |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Server selection timeout | `5000` | ❌ |
| `MONGODB_SOCKET_TIMEOUT_MS` | Socket timeout | `45000` | ❌ |
| `MONGODB_CONNECT_TIMEOUT_MS` | Connection timeout | `10000` | ❌ |
| `MONGODB_RETRY_WRITES` | Enable retry writes | `true` | ❌ |
| `MONGODB_RETRY_READS` | Enable retry reads | `true` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |

### Connection Pool Settings

The service uses connection pooling for optimal performance:

- **Min Pool Size:** 10 connections (always available)
- **Max Pool Size:** 100 connections (scales with load)
- **Max Idle Time:** 30 seconds (close idle connections)
- **Wait Queue Timeout:** 10 seconds (timeout if pool is full)

### Timeouts

- **Connect Timeout:** 10 seconds
- **Socket Timeout:** 45 seconds
- **Server Selection Timeout:** 5 seconds

### Retry Logic

- **Write Retries:** Enabled (automatic)
- **Read Retries:** Enabled (automatic)
- **Reconnection Attempts:** 5 with exponential backoff

---

## 🗄️ Database Structure

### Platform Database (caas_platform)

Multi-tenant platform management:

| Collection | Description |
|------------|-------------|
| `clients` | SAAS client organizations |
| `applications` | Applications registered by clients |
| `api_keys` | API keys for applications |
| `webhooks` | Webhook configurations |
| `rate_limits` | Rate limit configurations |
| `ip_whitelist` | IP whitelist for security |

### Tenants Database (caas_platform_tenants)

Per-tenant isolated data:

| Collection | Description |
|------------|-------------|
| `users` | End users |
| `conversations` | Chat conversations |
| `messages` | Chat messages |
| `files` | Uploaded files |
| `user_relationships` | Friends, blocks, etc. |
| `groups` | Group chats |
| `notifications` | User notifications |
| `presence` | User online/offline status |
| `typing_indicators` | Real-time typing status |
| `read_receipts` | Message read status |

### Billing Database (caas_platform_billing)

Billing and subscription management:

| Collection | Description |
|------------|-------------|
| `subscriptions` | Client subscriptions |
| `invoices` | Generated invoices |
| `payments` | Payment records |
| `usage_metrics` | Usage tracking |
| `billing_events` | Billing-related events |

---

## 🔍 Testing

### Check MongoDB Connection

```bash
# From within container
docker exec -it caas-mongodb-primary mongosh \
  -u caas_app -p caas_app_secret_2026 \
  --authenticationDatabase admin \
  caas_platform \
  --eval "db.runCommand({ ping: 1 })"

# From host (if mongosh is installed)
mongosh "mongodb://caas_app:caas_app_secret_2026@localhost:27017/caas_platform?authSource=admin"
```

### List Databases

```bash
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin \
  --eval "db.adminCommand({ listDatabases: 1 })"
```

### Check Replica Set (if multi-node)

```bash
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin \
  --eval "rs.status()"
```

### Verify Collections

```bash
docker exec -it caas-mongodb-primary mongosh \
  -u caas_app -p caas_app_secret_2026 \
  --authenticationDatabase admin \
  caas_platform \
  --eval "db.getCollectionNames()"
```

---

## 🛠️ API Reference

### ConnectionManager

Singleton class for managing MongoDB connections.

#### Methods

**`getInstance()`**
- Returns: `ConnectionManager`
- Get singleton instance

**`connect()`**
- Returns: `Promise<Connection>`
- Connect to MongoDB with configured options

**`disconnect()`**
- Returns: `Promise<void>`
- Disconnect from MongoDB

**`getConnection()`**
- Returns: `Connection`
- Get current connection (throws if not connected)

**`getState()`**
- Returns: `ConnectionState`
- Get current connection state

**`isConnected()`**
- Returns: `boolean`
- Check if currently connected

**`gracefulShutdown()`**
- Returns: `Promise<void>`
- Perform graceful shutdown

#### Events

- `connected` - Emitted when connection is established
- `disconnected` - Emitted when connection is lost
- `error` - Emitted on connection errors
- `reconnecting` - Emitted when attempting reconnection
- `reconnected` - Emitted when reconnection succeeds

### HealthCheck

Health monitoring for MongoDB connection.

#### Methods

**`check()`**
- Returns: `Promise<HealthCheckResult>`
- Perform health check

**`checkReplicaSet()`**
- Returns: `Promise<any>`
- Check replica set status

**`getStats()`**
- Returns: `Promise<any>`
- Get database statistics

---

## 🔒 Security

### Authentication

- **Admin User:** `caas_admin` (full access)
- **Application User:** `caas_app` (readWrite on platform databases)
- **Monitoring User:** `caas_monitor` (clusterMonitor role)

### Connection Security

- Authentication required (SCRAM-SHA-256)
- Keyfile authentication for replica set
- TLS/SSL support (configure in production)

### Best Practices

1. **Never commit .env files** with real credentials
2. **Rotate passwords** regularly in production
3. **Use IP whitelisting** for production deployments
4. **Enable audit logging** for compliance
5. **Implement backup strategy** for data protection

---

## 🚨 Troubleshooting

### Connection Refused

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs caas-mongodb-primary

# Verify port is exposed
netstat -an | grep 27017
```

### Authentication Failed

```bash
# Verify credentials
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin

# Re-initialize users if needed
docker-compose --profile tools up mongodb-init
```

### Replica Set Issues

```bash
# Check replica set status
docker exec -it caas-mongodb-primary mongosh \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin \
  --eval "rs.status()"

# Re-initialize replica set
docker-compose --profile tools up mongodb-init
```

### Connection Pool Exhausted

- Increase `MONGODB_MAX_POOL_SIZE`
- Check for connection leaks in application
- Monitor active connections

---

## 📈 Performance Optimization

### Connection Pooling

Adjust pool size based on your application load:

```env
# High-traffic applications
MONGODB_MIN_POOL_SIZE=20
MONGODB_MAX_POOL_SIZE=200

# Low-traffic applications
MONGODB_MIN_POOL_SIZE=5
MONGODB_MAX_POOL_SIZE=50
```

### Query Performance

- Always use indexes on frequently queried fields
- Use projection to limit returned fields
- Implement pagination for large result sets
- Use aggregation pipeline for complex queries

### Monitoring

- Track connection pool metrics
- Monitor query execution time
- Set up alerts for slow queries
- Use explain() to analyze query plans

---

## 🔄 Backup & Recovery

### Manual Backup

```bash
# Backup all databases
docker exec caas-mongodb-primary mongodump \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin \
  --out=/backup

# Copy backup from container
docker cp caas-mongodb-primary:/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Automated Backups

Set up automated backups using cron or MongoDB Cloud Manager.

### Restore

```bash
# Restore from backup
docker cp ./mongodb-backup-YYYYMMDD caas-mongodb-primary:/restore
docker exec caas-mongodb-primary mongorestore \
  -u caas_admin -p caas_secret_2026 \
  --authenticationDatabase admin \
  /restore
```

---

## 📝 Next Steps

1. **Implement Repository Pattern** - Create base repository for CRUD operations
2. **Add Schema Validation** - Define Mongoose schemas for all collections
3. **Implement Migrations** - Create migration system for schema changes
4. **Add Indexes** - Create indexes for performance optimization
5. **Implement Multi-Tenancy** - Add tenant isolation layer

---

## 📞 Support

For issues or questions:
- Check [Docker Setup Guide](../../local/SETUP_GUIDE.md)
- Review [Task Documentation](../../tasks/phases/phase-1-infrastructure/mongodb-service/README.md)
- See main project [README](../../README.md)

---

**Last Updated:** 2026-01-27  
**Version:** 1.0.0  
**Status:** ✅ Ready for Testing
