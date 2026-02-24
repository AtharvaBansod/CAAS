# Troubleshooting Guide: Authentication System (Phase 4.5.z.x)

## Common Issues

### 1. 401 Unauthorized on SDK Session Creation

**Symptoms:** `POST /api/v1/sdk/session` returns 401

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid API key format | Verify key starts with `caas_` prefix |
| API key not found in DB | Check `clients` collection in MongoDB |
| API key revoked | Regenerate via `POST /api/v1/client/api-keys/rotate` |
| Missing `X-API-Key` header | Ensure header is included in request |
| CLIENT is suspended | Check client `status` field in MongoDB |

**Debug steps:**
```bash
# Check auth service logs
docker compose logs -f auth-service | grep "validate-api-key"

# Verify client exists in MongoDB
docker compose exec mongodb mongosh --eval 'db.clients.find({email: "your@email.com"}).pretty()'

# Test API key validation directly
curl -X POST http://localhost:3001/api/v1/auth/internal/validate-api-key \
  -H "Content-Type: application/json" \
  -H "X-Service-Secret: your-service-secret" \
  -d '{"api_key": "caas_xxx", "ip_address": "127.0.0.1"}'
```

---

### 2. 403 Forbidden - IP Not Whitelisted

**Symptoms:** Request rejected with "IP not whitelisted" error

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Request from non-whitelisted IP | Add IP to whitelist via client API |
| Proxy not forwarding real IP | Configure proxy to send `X-Forwarded-For` |
| IP whitelist empty (strict mode) | Add at least one IP or disable strict mode |
| CIDR notation incorrect | Use proper format: `192.168.1.0/24` |

**Debug steps:**
```bash
# Check what IP the gateway sees
docker compose logs gateway | grep "client_ip"

# View client's IP whitelist
curl http://localhost:3001/api/v1/auth/client/ip-whitelist \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add IP to whitelist
curl -X POST http://localhost:3001/api/v1/auth/client/ip-whitelist \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip": "YOUR_IP_ADDRESS"}'
```

---

### 3. 403 Forbidden - Origin Not Allowed

**Symptoms:** Browser requests rejected with origin validation error

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Origin not in whitelist | Add origin via origin whitelist API |
| Missing `Origin` header | Check browser CORS configuration |
| Mismatch (http vs https) | Ensure protocol matches exactly |
| Port mismatch | Include port in origin: `http://localhost:3000` |

---

### 4. Socket Connection Rejected

**Symptoms:** WebSocket connection fails with auth error

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Invalid token | Get a new token via SDK session |
| Expired token | Refresh token before connecting |
| Auth service unreachable | Check auth service health |
| Missing token in handshake | Pass token in `auth.token` or `query.token` |

**Debug steps:**
```bash
# Check socket service logs
docker compose logs -f socket-service-1 | grep "auth"

# Check auth service health
curl http://localhost:3001/health

# Verify token is valid
curl -X POST http://localhost:3001/api/v1/auth/internal/validate \
  -H "Content-Type: application/json" \
  -H "X-Service-Secret: your-service-secret" \
  -d '{"token": "YOUR_JWT_TOKEN"}'
```

---

### 5. Inter-Service Call Fails with 401

**Symptoms:** Gateway-to-downstream service call returns 401

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| `SERVICE_SECRET` mismatch | Ensure same secret across all services |
| Missing `X-Service-Secret` header | Check context headers middleware |
| Service not configured | Add `SERVICE_SECRET` env var to service |

**Debug steps:**
```bash
# Check if service secrets match
docker compose exec gateway printenv SERVICE_SECRET
docker compose exec auth-service printenv SERVICE_SECRET

# Check context headers in logs
docker compose logs gateway | grep "context_headers"
```

---

### 6. JWT_SECRET Not Configured

**Symptoms:** Auth service fails to start or returns 500 on token operations

**Solutions:**
- Set `JWT_SECRET` in `.env` file
- Ensure it's at least 32 characters for security
- Restart auth service after updating

---

### 7. Redis Connection Issues

**Symptoms:** Socket context not being stored/retrieved, slow auth

**Debug steps:**
```bash
# Check Redis connectivity
docker compose exec redis redis-cli ping

# Check socket contexts in Redis
docker compose exec redis redis-cli keys "socket:*"

# Check API key cache
docker compose exec redis redis-cli keys "apikey:*"
```

---

## Debugging Tips

1. **Enable debug logging:**
   ```env
   LOG_LEVEL=debug
   ```

2. **Trace a request across services:**
   - All requests get an `X-Request-Id` header
   - Search logs with this ID: `docker compose logs | grep "REQUEST_ID"`

3. **Check Redis cache:**
   ```bash
   # See all cached tokens
   docker compose exec redis redis-cli keys "token:*"
   
   # Check specific socket context
   docker compose exec redis redis-cli get "socket:SOCKET_ID"
   ```

4. **Check MongoDB for auth data:**
   ```bash
   # Check clients
   docker compose exec mongodb mongosh --eval 'db.clients.find().pretty()'
   
   # Check sessions
   docker compose exec mongodb mongosh --eval 'db.sessions.find().sort({created_at: -1}).limit(5).pretty()'
   ```

5. **Verify environment variables:**
   ```bash
   docker compose exec gateway printenv | grep -E "(JWT_|SERVICE_|AUTH_)"
   docker compose exec auth-service printenv | grep -E "(JWT_|SERVICE_)"
   docker compose exec socket-service-1 printenv | grep -E "(AUTH_|SERVICE_)"
   ```

## Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| Auth Service | `GET /health` | `{"status": "ok"}` |
| Gateway | `GET /health` | `{"status": "ok"}` |
| Socket Service | `GET /health` | `{"status": "ok"}` |
