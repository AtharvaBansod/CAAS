# CAAS Platform - Developer Quick Start

**⚠️ CRITICAL: This is a 100% Docker-based project. DO NOT run npm commands locally!**

---

## 🚀 Quick Start (3 Commands)

```powershell
# 1. Clone the repo
git clone <repo-url>
cd caas

# 2. Start everything (auto-builds in Docker)
.\start.ps1

# 3. That's it! Services are running.
```

**Access Points:**
- Gateway API: http://localhost:3000
- Socket Service 1: http://localhost:3002
- Socket Service 2: http://localhost:3003
- Kafka UI: http://localhost:8080
- Mongo Express: http://localhost:8082
- Redis Commander: http://localhost:8083

---

## ❌ Common Mistakes (DON'T DO THIS!)

```powershell
# ❌ DON'T install dependencies locally
cd services\socket-service
npm install              # NO! Everything builds in Docker

# ❌ DON'T build locally  
npm run build            # NO! Builds happen in Docker

# ❌ DON'T run locally
npm start                # NO! Services run in Docker only
```

**If you see `node_modules/` or `dist/` in any service folder, DELETE IT!**

---

## ✅ Correct Workflow

### Making Code Changes

```powershell
# 1. Edit source files
# Edit files in: services/[service]/src/

# 2. Restart to apply changes
.\stop.ps1
.\start.ps1

# Docker automatically rebuilds changed services
```

### Viewing Logs

```powershell
# View specific service
docker logs caas-socket-1
docker logs caas-gateway

# Follow logs in real-time
docker logs -f caas-socket-1
```

### Running Tests

```powershell
.\test-phase3.ps1
```

### Stopping Services

```powershell
.\stop.ps1
```

---

## 🏗️ Project Structure

```
caas/
├── start.ps1                 ← Start command
├── stop.ps1                  ← Stop command
├── docker-compose.yml        ← All services defined here
│
└── services/
    ├── gateway/
    │   ├── Dockerfile         ← Builds IN Docker
    │   ├── src/              ← Edit code here
    │   ├── package.json      ← Add dependencies here
    │   └── tsconfig.json     ← TypeScript config
    │
    └── socket-service/
        ├── Dockerfile         ← Builds IN Docker
        ├── src/              ← Edit code here
        ├── package.json      ← Add dependencies here
        └── tsconfig.json     ← TypeScript config
```

---

## 📦 Adding Dependencies

### Add a Package

```json
// Edit services/socket-service/package.json
{
  "dependencies": {
    "socket.io": "^4.7.2",
    "new-package": "^1.0.0"  // ← Add here
  }
}
```

Then restart:
```powershell
.\stop.ps1
.\start.ps1  # Docker reinstalls dependencies automatically
```

---

## 🔍 Health Check

Verify everything is running:

```powershell
# Check all containers
docker ps --filter "name=caas"

# Should show:
# caas-socket-1
# caas-socket-2
# caas-gateway
# caas-mongodb-primary
# caas-redis
# caas-kafka-1, caas-kafka-2, caas-kafka-3
# ... and more
```

Verify clean local state:

```powershell
# Should all return: False
Test-Path ".\services\socket-service\node_modules"
Test-Path ".\services\socket-service\dist"
Test-Path ".\services\gateway\node_modules"
Test-Path ".\services\gateway\dist"
```

---

## 🐛 Troubleshooting

### Services won't start

```powershell
# Check Docker is running
docker --version

# View specific service logs
docker logs caas-socket-1

# Force clean rebuild
.\stop.ps1
docker compose down -v  # Remove volumes
docker compose build --no-cache
.\start.ps1
```

### Accidentally created local node_modules

```powershell
# Delete them
Remove-Item -Path ".\services\*\node_modules" -Recurse -Force
Remove-Item -Path ".\services\*\dist" -Recurse -Force

# Restart
.\stop.ps1
.\start.ps1
```

### Port already in use

```powershell
# Stop all containers
.\stop.ps1

# Check what's using the port
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Kill the process or change ports in docker-compose.yml
```

---

## 📚 Documentation

- **PURE_DOCKER_ARCHITECTURE.md** - Detailed architecture explanation
- **DOCKER_ARCHITECTURE.md** - Docker structure
- **PHASE3_TASK_STATUS.md** - Implementation status
- **PHASE3_API_REFERENCE.md** - API reference

---

## 🎯 Requirements

**ONLY Docker Desktop is required!**

- Docker Desktop: https://www.docker.com/products/docker-desktop/
- PowerShell (built-in on Windows)

**No need to install:**
- ❌ Node.js
- ❌ MongoDB
- ❌ Redis
- ❌ Kafka
- ❌ TypeScript
- ❌ npm packages

Everything runs in Docker!

---

## ⚡ Commands Reference

| Command | Description |
|---------|-------------|
| `.\start.ps1` | Start all services (auto-builds) |
| `.\stop.ps1` | Stop all services |
| `.\test-phase3.ps1` | Run Phase 3 tests |
| `docker ps` | List running containers |
| `docker logs <container>` | View container logs |
| `docker logs -f <container>` | Follow logs in real-time |
| `docker compose build` | Rebuild services |
| `docker compose down` | Stop and remove containers |

---

## 🎓 Understanding Docker Builds

When you run `.\start.ps1`:

1. Docker reads `docker-compose.yml`
2. For each service (gateway, socket-service):
   - Reads the Dockerfile
   - Creates a temporary build container
   - Copies `package.json` into container
   - Runs `npm install` INSIDE the container
   - Copies source code into container
   - Runs `npm run build` INSIDE the container
   - Creates final production container
   - Starts the service
3. All infrastructure services start from official images
4. Initialization scripts run automatically

**Your local files are never touched!**

---

**Happy Coding! 🚀**

Remember: **Edit code → Run `.\start.ps1` → Everything else is automatic!**
