# 🚀 CAAS MongoDB - Quick Reference

## Start MongoDB (Single Node - Testing)

```powershell
cd c:\me\caas\local
.\quick-start.ps1
```

## Initialize Database (Manual - if auto-init doesn't work)

```powershell
# Create users
docker exec -it caas-mongodb-primary mongosh `
  -u caas_admin -p caas_secret_2026 `
  --authenticationDatabase admin `
  --file /docker-entrypoint-initdb.d/02-create-users.js

# Create databases and collections
docker exec -it caas-mongodb-primary mongosh `
  -u caas_admin -p caas_secret_2026 `
  --authenticationDatabase admin `
  --file /docker-entrypoint-initdb.d/03-create-databases.js
```

## Connection URIs

**Testing (1 node):**
```
mongodb://caas_app:caas_app_secret_2026@localhost:27017/caas_platform?authSource=admin
```

**Production (3 nodes):**
```
mongodb://caas_app:caas_app_secret_2026@localhost:27017,localhost:27018,localhost:27019/caas_platform?replicaSet=caas-rs&authSource=admin
```

## Common Commands

```powershell
# Check status
docker ps | Select-String "caas"

# View logs
docker logs caas-mongodb-primary
docker logs caas-redis

# Stop services
docker-compose -f docker-compose-simple.yml down

# Restart services
docker-compose -f docker-compose-simple.yml up -d

# Connect to MongoDB
docker exec -it caas-mongodb-primary mongosh `
  -u caas_app -p caas_app_secret_2026 `
  --authenticationDatabase admin `
  caas_platform
```

## Test Connection

```powershell
# List collections
docker exec -it caas-mongodb-primary mongosh `
  -u caas_app -p caas_app_secret_2026 `
  --authenticationDatabase admin `
  caas_platform `
  --eval "db.getCollectionNames()"

# Insert test data
docker exec -it caas-mongodb-primary mongosh `
  -u caas_app -p caas_app_secret_2026 `
  --authenticationDatabase admin `
  caas_platform `
  --eval "db.saas_clients.insertOne({name: 'Test Client', tier: 'free'})"
```

## Web UIs

```powershell
# Start Mongo Express
docker-compose -f docker-compose-simple.yml --profile tools up -d mongo-express

# Open in browser
# http://localhost:8082 (admin / admin123)
```

## Use MongoDB Service

```bash
cd c:\me\caas\services\mongodb-service
npm install
cp .env.example .env
npm run dev
```

## Troubleshooting

**Docker not running:**
```powershell
# Start Docker Desktop and wait for it to be ready
```

**Connection failed:**
```powershell
# Check if MongoDB is running
docker ps | Select-String "mongodb"

# Check MongoDB logs
docker logs caas-mongodb-primary

# Restart MongoDB
docker restart caas-mongodb-primary
```

**Auth failed:**
```powershell
# Re-run user creation script
docker exec -it caas-mongodb-primary mongosh `
  -u caas_admin -p caas_secret_2026 `
  --authenticationDatabase admin `
  --file /docker-entrypoint-initdb.d/02-create-users.js
```

## Users

| User | Password | Access |
|------|----------|--------|
| caas_admin | caas_secret_2026 | Full admin |
| caas_app | caas_app_secret_2026 | App user |
| caas_monitor | caas_monitor_2026 | Monitoring |

## Databases

- `caas_platform` - Platform management
- `caas_platform_tenants` - Tenant data
- `caas_platform_billing` - Billing data

## Documentation

- [MongoDB Service README](services/mongodb-service/README.md)
- [Docker Setup Guide](local/SETUP_GUIDE.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
