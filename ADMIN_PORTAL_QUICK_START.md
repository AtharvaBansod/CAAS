# Admin Portal Quick Start Guide

## Access the Admin Portal

**URL**: http://localhost:4000

## Quick Test Flow

### 1. Start All Services
```powershell
./start.ps1
```

Wait for all services to be healthy (~2 minutes).

### 2. Register a New Tenant

**Option A: Via Browser**
1. Open http://localhost:4000
2. Click "Create one"
3. Fill in the form:
   - Company: Your Company Name
   - Email: admin@yourcompany.com
   - Password: (min 8 characters)
   - Plan: Choose one
4. Accept terms
5. Click "Create account"

**Option B: Via API**
```powershell
$body = @{
    company_name = "My Company"
    email = "admin@mycompany.com"
    password = "SecurePass123!"
    plan = "business"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/client/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### 3. Login

**Via Browser**
1. Go to http://localhost:4000/login
2. Enter your email and password
3. Click "Sign in"
4. You'll be redirected to the dashboard

**Via API**
```powershell
$body = @{
    email = "admin@mycompany.com"
    password = "SecurePass123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/client/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Save the access token
$accessToken = $response.access_token
```

### 4. View Dashboard

**Via Browser**
- After login, you'll see:
  - Active Users count
  - Messages Today count
  - API Calls count
  - Live Connections count
  - Recent Activity feed
  - Quick Action links

**Via API**
```powershell
$headers = @{
    "Authorization" = "Bearer $accessToken"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/dashboard" `
    -Method GET `
    -Headers $headers
```

## Available Endpoints

### Public (No Auth Required)
- `POST /api/v1/auth/client/register` - Register new tenant
- `POST /api/v1/auth/client/login` - Login
- `GET /health` - Health check
- `GET /documentation` - Swagger UI

### Protected (Requires Auth Token)
- `POST /api/v1/auth/client/refresh` - Refresh token
- `GET /api/v1/admin/dashboard` - Dashboard data
- `POST /api/v1/auth/client/logout` - Logout

## Troubleshooting

### Admin Portal Not Loading
```powershell
# Check if container is running
docker ps | Select-String "admin-portal"

# Check logs
docker logs caas-admin-portal --tail 50

# Restart if needed
docker compose restart admin-portal
```

### Gateway Not Responding
```powershell
# Check gateway health
curl http://localhost:3000/health

# Check logs
docker logs caas-gateway --tail 50

# Restart if needed
docker compose restart gateway
```

### Login Fails
1. Verify you registered with the correct email
2. Check password is correct (min 8 characters)
3. Check gateway logs for errors:
   ```powershell
   docker logs caas-gateway --tail 50
   ```

### Dashboard Shows Error
1. Check if you're logged in (have valid token)
2. Check gateway logs:
   ```powershell
   docker logs caas-gateway --tail 50
   ```
3. Verify gateway is healthy:
   ```powershell
   curl http://localhost:3000/health
   ```

## Run Integration Tests

```powershell
cd tests
docker build -t caas-phase6-test -f Dockerfile.phase6-test .
docker run --rm --network caas_caas-network `
  -e GATEWAY_URL=http://gateway:3000 `
  -e ADMIN_PORTAL_URL=http://admin-portal:3100 `
  caas-phase6-test
```

Expected output:
```
✓ Admin Portal Health Check
✓ Gateway Health Check
✓ Client Registration via Gateway
✓ Client Login via Gateway
✓ Dashboard API via Gateway
✓ Token Refresh via Gateway

Total: 6
Passed: 6
Failed: 0
```

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Admin Portal | http://localhost:4000 | Client-facing UI |
| Gateway API | http://localhost:3000 | API Gateway |
| Gateway Docs | http://localhost:3000/documentation | Swagger UI |
| Kafka UI | http://localhost:8080 | Kafka management |
| Mongo Express | http://localhost:8082 | MongoDB UI |
| Redis Commander | http://localhost:8083 | Redis UI |
| MinIO Console | http://localhost:9001 | Object storage UI |
| Elasticsearch | http://localhost:9200 | Search engine |

## Default Credentials

### MinIO
- Username: `minioadmin`
- Password: `minioadmin`

### MongoDB
- Username: `caas_admin`
- Password: `caas_secret_2026`

### Redis Commander
- No authentication required (localhost only)

## Stop All Services

```powershell
./stop.ps1
```

Or:

```powershell
docker compose down
```

To also remove volumes:

```powershell
docker compose down -v
```

## Need Help?

1. Check service logs:
   ```powershell
   docker compose logs [service-name]
   ```

2. Check service status:
   ```powershell
   docker compose ps
   ```

3. Restart specific service:
   ```powershell
   docker compose restart [service-name]
   ```

4. Rebuild and restart:
   ```powershell
   docker compose build [service-name]
   docker compose up -d [service-name]
   ```
