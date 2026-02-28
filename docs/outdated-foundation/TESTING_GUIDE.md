# CAAS Platform Testing Guide

## 🧪 Automated System Test

Run the comprehensive system test to verify all services:

```powershell
.\test-system.ps1
```

This will test:
- ✅ MongoDB connectivity and replica set
- ✅ Redis connectivity
- ✅ Kafka broker health
- ✅ Kafka topics creation
- ✅ Schema Registry
- ✅ API Gateway health

## 📋 Manual Testing

### 1. MongoDB Testing

#### Test Connection
```bash
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026
```

#### Test Replica Set
```javascript
// Check replica set status
rs.status()

// Check replica set configuration
rs.conf()

// List all members
rs.status().members
```

#### Test Database Operations
```javascript
// Switch to platform database
use caas_platform

// List collections
show collections

// Insert test document
db.test.insertOne({ message: "Hello CAAS", timestamp: new Date() })

// Query test document
db.test.find()

// Clean up
db.test.drop()
```

#### Test Multi-Tenancy
```javascript
// Create tenant database
use tenant_test123

// Create collection
db.createCollection("messages")

// Insert data
db.messages.insertOne({
  tenantId: "test123",
  content: "Test message",
  createdAt: new Date()
})

// Verify
db.messages.find()
```

### 2. Redis Testing

#### Test Connection
```bash
docker compose exec redis redis-cli -a caas_redis_2026
```

#### Test Operations
```redis
# Set a key
SET test:key "Hello CAAS"

# Get a key
GET test:key

# Set with expiration (60 seconds)
SETEX test:temp 60 "Temporary value"

# Check TTL
TTL test:temp

# List all keys
KEYS *

# Delete key
DEL test:key

# Test pub/sub
SUBSCRIBE test:channel
# (In another terminal)
PUBLISH test:channel "Test message"
```

### 3. Kafka Testing

#### List Topics
```bash
docker compose exec kafka-1 kafka-topics --bootstrap-server localhost:9092 --list
```

#### Describe Topic
```bash
docker compose exec kafka-1 kafka-topics \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic platform.events
```

#### Produce Messages
```bash
# Interactive producer
docker compose exec -it kafka-1 kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic platform.events

# Type messages and press Enter
# Press Ctrl+C to exit

# Or produce from echo
echo "Test message from CLI" | docker compose exec -T kafka-1 \
  kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic platform.events
```

#### Consume Messages
```bash
# Consume from beginning
docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic platform.events \
  --from-beginning \
  --max-messages 10

# Consume with key and timestamp
docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic platform.events \
  --from-beginning \
  --property print.key=true \
  --property print.timestamp=true \
  --max-messages 10
```

#### Test Consumer Groups
```bash
# Start consumer in group
docker compose exec kafka-1 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic platform.events \
  --group test-group \
  --from-beginning

# List consumer groups
docker compose exec kafka-1 kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --list

# Describe consumer group
docker compose exec kafka-1 kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group test-group \
  --describe
```

### 4. Schema Registry Testing

#### List Schemas
```bash
curl http://localhost:8081/subjects
```

#### Register Schema
```bash
curl -X POST http://localhost:8081/subjects/test-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"Test\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"message\",\"type\":\"string\"}]}"
  }'
```

#### Get Schema
```bash
curl http://localhost:8081/subjects/test-value/versions/latest
```

### 5. API Gateway Testing

#### Health Check
```bash
curl http://localhost:3000/health
```

#### View API Documentation
```bash
# Open in browser
start http://localhost:3000/docs
```

#### Test Endpoints (when implemented)
```bash
# Example: Create client (Phase 2)
curl -X POST http://localhost:3000/api/v1/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "email": "test@example.com"
  }'
```

## 🔍 Monitoring & Debugging

### View Service Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway
docker compose logs -f mongodb-primary
docker compose logs -f kafka-1

# Last 100 lines
docker compose logs --tail=100 gateway

# Since specific time
docker compose logs --since 2024-01-01T00:00:00 gateway
```

### Check Service Status

```bash
# All services
docker compose ps

# Detailed status
docker compose ps -a

# Service health
docker inspect caas-gateway --format='{{.State.Health.Status}}'
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Specific container
docker stats caas-gateway

# Disk usage
docker system df

# Detailed disk usage
docker system df -v
```

## 🎨 Visual Testing Tools

### 1. Kafka UI (http://localhost:8080)

**Test Message Flow**:
1. Navigate to Topics → platform.events
2. Click "Produce Message"
3. Enter test message
4. Click "Produce"
5. View message in Messages tab

**Monitor Consumer Groups**:
1. Navigate to Consumers
2. View consumer group lag
3. Check partition assignments

### 2. MongoDB Express (http://localhost:8082)

**Credentials**: admin / admin123

**Test Database Operations**:
1. Select `caas_platform` database
2. Click on a collection
3. View documents
4. Try adding/editing documents
5. Run queries

### 3. Redis Commander (http://localhost:8083)

**Test Cache Operations**:
1. View all keys
2. Click on a key to see value
3. Add new key-value pair
4. Set TTL on keys
5. Delete keys

## 🧪 Integration Testing

### Test Complete Flow

```bash
# 1. Start services
docker compose up -d

# 2. Wait for initialization
Start-Sleep -Seconds 30

# 3. Run system test
.\test-system.ps1

# 4. Test MongoDB
docker compose exec mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --eval "db.adminCommand('ping')"

# 5. Test Kafka message flow
echo "Integration test message" | docker compose exec -T kafka-1 kafka-console-producer --bootstrap-server localhost:9092 --topic platform.events

docker compose exec kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic platform.events --from-beginning --max-messages 1

# 6. Test Gateway
curl http://localhost:3000/health

# 7. Check all services
docker compose ps
```

## 🐛 Troubleshooting Tests

### MongoDB Tests Failing

```bash
# Check if MongoDB is running
docker compose ps mongodb-primary

# Check MongoDB logs
docker compose logs mongodb-primary

# Restart MongoDB
docker compose restart mongodb-primary

# Reinitialize replica set
docker compose restart mongodb-init

# Wait and retry
Start-Sleep -Seconds 20
.\test-system.ps1
```

### Kafka Tests Failing

```bash
# Check if Kafka is running
docker compose ps kafka-1

# Check Kafka logs
docker compose logs kafka-1

# Check ZooKeeper
docker compose logs zookeeper

# Restart Kafka cluster
docker compose restart zookeeper kafka-1 kafka-2 kafka-3

# Reinitialize topics
docker compose restart kafka-init

# Wait and retry
Start-Sleep -Seconds 30
.\test-system.ps1
```

### Gateway Tests Failing

```bash
# Check if Gateway is running
docker compose ps gateway

# Check Gateway logs
docker compose logs gateway

# Check dependencies
docker compose ps mongodb-primary redis kafka-1

# Restart Gateway
docker compose restart gateway

# Rebuild Gateway
docker compose up -d --build gateway

# Wait and retry
Start-Sleep -Seconds 10
.\test-system.ps1
```

## 📊 Performance Testing

### MongoDB Performance

```javascript
// Connect to MongoDB
use caas_platform

// Insert many documents
for (let i = 0; i < 1000; i++) {
  db.test_performance.insertOne({
    index: i,
    data: "Test data " + i,
    timestamp: new Date()
  })
}

// Query performance
db.test_performance.find().explain("executionStats")

// Create index
db.test_performance.createIndex({ index: 1 })

// Query with index
db.test_performance.find({ index: 500 }).explain("executionStats")

// Clean up
db.test_performance.drop()
```

### Kafka Performance

```bash
# Producer performance test
docker compose exec kafka-1 kafka-producer-perf-test \
  --topic platform.events \
  --num-records 10000 \
  --record-size 1000 \
  --throughput -1 \
  --producer-props bootstrap.servers=localhost:9092

# Consumer performance test
docker compose exec kafka-1 kafka-consumer-perf-test \
  --topic platform.events \
  --messages 10000 \
  --bootstrap-server localhost:9092
```

### Gateway Performance

```bash
# Install Apache Bench (if not installed)
# choco install apache-httpd

# Simple load test
ab -n 1000 -c 10 http://localhost:3000/health

# With keep-alive
ab -n 1000 -c 10 -k http://localhost:3000/health
```

## ✅ Test Checklist

Before considering Phase 1 complete, verify:

- [ ] All services start successfully
- [ ] MongoDB replica set is initialized
- [ ] All Kafka topics are created
- [ ] Gateway responds to health checks
- [ ] Can produce and consume Kafka messages
- [ ] Can read/write to MongoDB
- [ ] Can read/write to Redis
- [ ] All monitoring UIs are accessible
- [ ] No error logs in any service
- [ ] System test script passes

## 📝 Test Results Documentation

After running tests, document results:

```markdown
## Test Results - [Date]

### Environment
- Docker Version: [version]
- OS: [Windows/Linux/Mac]
- RAM: [amount]
- CPU: [cores]

### Test Results
- MongoDB: ✅ PASS
- Redis: ✅ PASS
- Kafka: ✅ PASS
- Gateway: ✅ PASS

### Performance Metrics
- Gateway Response Time: [ms]
- MongoDB Query Time: [ms]
- Kafka Throughput: [msg/s]

### Issues Found
- [List any issues]

### Notes
- [Any additional notes]
```

---

**Happy Testing! 🧪**
