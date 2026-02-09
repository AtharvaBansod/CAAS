# CAAS Platform - Browser-Accessible Endpoints

**Quick Reference Guide for All Web UIs**

---

## 🌐 All Browser-Accessible URLs

### Primary Services

| Service | URL | Status | Auth Required |
|---------|-----|--------|---------------|
| **Gateway Health** | http://localhost:3000/health | ✅ | No |
| **Gateway API** | http://localhost:3000 | ✅ | Yes (JWT) |
| **Gateway Metrics** | http://localhost:3001 | ✅ | No |
| **API Documentation** | http://localhost:3000/documentation | ✅ | No |

### Management UIs

| Service | URL | Status | Credentials |
|---------|-----|--------|-------------|
| **Kafka UI** | http://localhost:8080 | ✅ | None |
| **Mongo Express** | http://localhost:8082 | ✅ | admin / admin123 |
| **Redis Commander** | http://localhost:8083 | ✅ | None |
| **Schema Registry** | http://localhost:8081 | ✅ | None |

---

## 📋 Detailed Endpoint Information

### 1. Gateway Health Check
**URL:** http://localhost:3000/health  
**Method:** GET  
**Auth:** None  
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-08T06:48:04.787Z"
}
```

**What it shows:**
- Gateway is running
- Basic connectivity check

---

### 2. API Documentation (Swagger UI)
**URL:** http://localhost:3000/documentation  
**Method:** GET  
**Auth:** None  
**Format:** Interactive Swagger UI

**What it shows:**
- All available API endpoints
- Request/response schemas
- Try out API calls directly
- Authentication options

**Available Endpoints:**
- Health & Monitoring (5 endpoints)
- Authentication (7 endpoints)
- Webhooks (6 endpoints)
- Tenant Management (5 endpoints)
- Utility (1 endpoint)

**How to use:**
1. Open http://localhost:3000/documentation
2. Browse available endpoints
3. Click "Authorize" to add JWT token
4. Click "Try it out" on any endpoint
5. Fill parameters and click "Execute"

---

### 3. Gateway Metrics
**URL:** http://localhost:3001  
**Method:** GET  
**Auth:** None  
**Format:** Prometheus metrics

**What it shows:**
- Request counts
- Response times
- Error rates
- System metrics

---

### 4. Kafka UI
**URL:** http://localhost:8080  
**Auth:** None  
**Features:**
- ✅ View all Kafka brokers
- ✅ Browse topics
- ✅ View messages
- ✅ Consumer groups
- ✅ Schema registry integration
- ✅ Cluster configuration

**What you can do:**
- Monitor Kafka cluster health
- View topic configurations
- Browse messages in topics
- Monitor consumer lag
- View broker metrics

**Topics to explore:**
- platform.events
- platform.audit
- platform.notifications
- internal.dlq
- auth.revocation.events
- events

---

### 5. Mongo Express
**URL:** http://localhost:8082  
**Username:** admin  
**Password:** admin123  

**Features:**
- ✅ Browse databases
- ✅ View collections
- ✅ Query documents
- ✅ Edit documents
- ✅ View indexes
- ✅ Database statistics

**What you can do:**
- Browse caas_platform database
- View all 32 collections
- Query and filter documents
- View collection statistics
- Manage indexes

**Collections to explore:**
- saas_clients
- applications
- api_keys
- user_sessions
- authorization_policies
- roles
- user_keys
- security_audit_logs

---

### 6. Redis Commander
**URL:** http://localhost:8083  
**Auth:** None  

**Features:**
- ✅ Browse all keys
- ✅ View key values
- ✅ Edit keys
- ✅ Delete keys
- ✅ View key TTL
- ✅ Server info

**What you can do:**
- View cached data
- Monitor session storage
- View token blacklist
- Check policy cache
- Monitor Redis memory usage

**Key patterns to look for:**
- session:*
- revoked:*
- policy:*
- refresh:*

---

### 7. Schema Registry
**URL:** http://localhost:8081  
**Auth:** None  
**Format:** JSON API

**Endpoints:**
- GET /subjects - List all subjects
- GET /schemas/ids/{id} - Get schema by ID
- GET /subjects/{subject}/versions - List versions

**What it shows:**
- Kafka message schemas
- Schema versions
- Schema compatibility

---

## 🔍 What to Check in Each UI

### Kafka UI - Health Check
1. Go to http://localhost:8080
2. Check "Brokers" tab - should show 3 brokers
3. Check "Topics" tab - should show 6 topics
4. Click on "platform.events" - should show 3 partitions

### Mongo Express - Database Check
1. Go to http://localhost:8082
2. Login with admin/admin123
3. Click "caas_platform" database
4. Should see 32 collections
5. Click "user_sessions" - should show indexes

### Redis Commander - Cache Check
1. Go to http://localhost:8083
2. Should see Redis connection info
3. Browse keys (may be empty if no activity)
4. Check "Server Info" for Redis stats

---

## 🚫 Known Issues

### No Critical Issues ✅

All endpoints are working properly!

### Minor Notes

- **KafkaJS Warning:** You may see a deprecation warning in gateway logs about the default partitioner. This is harmless and can be silenced with the environment variable `KAFKAJS_NO_PARTITIONER_WARNING=1`

---

## 🧪 Testing Endpoints

### Quick Health Check Script
```powershell
# Test all endpoints
curl http://localhost:3000/health
curl http://localhost:3001
curl http://localhost:8080
curl http://localhost:8081
curl http://localhost:8083

# Test Mongo Express (with auth)
$cred = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin123"))
curl -Headers @{Authorization="Basic $cred"} http://localhost:8082
```

### Browser Bookmarks
Save these for quick access:
- Gateway Health: http://localhost:3000/health
- Kafka UI: http://localhost:8080
- Mongo Express: http://localhost:8082
- Redis Commander: http://localhost:8083

---

## 📊 What Each UI Shows

### Kafka UI
**Purpose:** Monitor message queue system  
**Shows:**
- Message throughput
- Consumer lag
- Topic configurations
- Broker health

**Use when:**
- Debugging message flow
- Monitoring event processing
- Checking consumer groups
- Viewing message content

### Mongo Express
**Purpose:** Browse database content  
**Shows:**
- All collections
- Document data
- Indexes
- Database statistics

**Use when:**
- Checking data storage
- Verifying collections created
- Querying documents
- Debugging data issues

### Redis Commander
**Purpose:** Monitor cache and sessions  
**Shows:**
- Cached keys
- Session data
- Token blacklist
- Memory usage

**Use when:**
- Debugging cache issues
- Checking session storage
- Monitoring memory
- Verifying token revocation

---

## 🔐 Security Notes

### Production Considerations

**Mongo Express:**
- ⚠️ Change default credentials
- ⚠️ Disable in production or restrict access
- ⚠️ Use VPN or IP whitelist

**Kafka UI:**
- ⚠️ Add authentication in production
- ⚠️ Restrict network access
- ⚠️ Use HTTPS

**Redis Commander:**
- ⚠️ Add authentication in production
- ⚠️ Restrict network access
- ⚠️ Use HTTPS

**Current Setup:**
- ✅ Development mode
- ✅ Local access only
- ⚠️ Not production-ready

---

## 📱 Mobile Access

All UIs are responsive and work on mobile browsers:
- Replace `localhost` with your machine's IP address
- Example: http://192.168.1.100:8080

---

## 🆘 Troubleshooting

### UI Not Loading

**Check if service is running:**
```powershell
docker ps | Select-String "kafka-ui|mongo-express|redis-commander"
```

**Check logs:**
```powershell
docker logs caas-kafka-ui
docker logs caas-mongo-express
docker logs caas-redis-commander
```

**Restart service:**
```powershell
docker compose restart kafka-ui
docker compose restart mongo-express
docker compose restart redis-commander
```

### Connection Refused

**Check if port is accessible:**
```powershell
Test-NetConnection localhost -Port 8080
Test-NetConnection localhost -Port 8082
Test-NetConnection localhost -Port 8083
```

**Check firewall:**
- Ensure Docker Desktop is running
- Check Windows Firewall settings
- Verify no other service using the port

---

## 📚 Additional Resources

- **System Overview:** See `SYSTEM_OVERVIEW.md`
- **API Reference:** See `docs/API_REFERENCE.md`
- **Architecture:** See `docs/SYSTEM_OVERVIEW.md`

---

**Last Updated:** February 8, 2026  
**All URLs tested and verified:** ✅
