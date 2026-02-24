# Migration Guide: Authentication Refactor (Phase 4.5.z.x)

## Overview

This guide covers the migration from the old RSA key-based authentication system to the new centralized auth service architecture. The key change: **Auth Service is now the single source of truth** for all token operations.

## Breaking Changes

| Change | Old Behavior | New Behavior |
|--------|-------------|--------------|
| JWT Signing | RSA (RS256) with PEM key files | HMAC (HS256) with `JWT_SECRET` env var |
| Token Verification | Each service has public key | Only Auth Service verifies tokens |
| Gateway Auth | Local JWT verification | Delegates to Auth Service via HTTP |
| Socket Auth | Public key verification | Delegates to Auth Service on connect |
| API Key Auth | Local tenant lookup | Delegates to Auth Service |
| Key Files | `keys/private.pem`, `keys/public.pem` | **Deleted** - no longer needed |

## Migration Steps

### Step 1: Update Environment Variables

**Add these new variables to your `.env`:**

```env
# Replace your RSA keys with:
JWT_SECRET=your-strong-random-secret-at-least-32-characters

# New inter-service authentication:
SERVICE_SECRET=your-strong-service-secret-at-least-32-characters
```

**Remove these old variables:**
```env
# REMOVE: No longer needed
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ALGORITHM=RS256
```

### Step 2: Delete Key Files

```bash
# Delete the keys directory
rm -rf keys/

# Delete key generation scripts
rm -f scripts/generate-jwt-keys.js
rm -f services/gateway/generate-keys.js
```

### Step 3: Update Docker Compose

The `docker-compose.yml` has been updated automatically:
- `auth-service`: Uses `JWT_SECRET` instead of key file paths; removed `keys` volume mount
- `gateway`: Removed `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`; added `SERVICE_SECRET`; simplified `command` (no key file creation)
- `socket-service-1/2`: Removed `JWT_PUBLIC_KEY`; added `AUTH_SERVICE_URL` and `SERVICE_SECRET`

### Step 4: Rebuild and Restart

```bash
# Stop all services
docker compose down

# Rebuild all affected services
docker compose build auth-service gateway socket-service-1 socket-service-2

# Start services
docker compose up -d
```

### Step 5: Verify

1. Check auth-service health: `curl http://localhost:3007/health`
2. Check gateway health: `curl http://localhost:3000/health`
3. Test client registration: `POST /api/v1/client/register`
4. Test SDK session creation: `POST /api/v1/sdk/session`
5. Test socket connection with JWT token

## Environment Variable Reference

### New Variables

| Variable | Required By | Default | Description |
|----------|-------------|---------|-------------|
| `JWT_SECRET` | Auth Service | `dev-jwt-secret-change-in-production` | HMAC signing secret for JWT tokens |
| `SERVICE_SECRET` | All Services | `dev-service-secret` | Shared secret for inter-service auth |
| `AUTH_SERVICE_URL` | Gateway, Socket | `http://auth-service:3001` | Auth service HTTP endpoint |

### Removed Variables

| Variable | Previously Used By |
|----------|-------------------|
| `JWT_PRIVATE_KEY` | Gateway, Auth Service |
| `JWT_PUBLIC_KEY` | Gateway, Socket Service |
| `JWT_PRIVATE_KEY_PATH` | Auth Service |
| `JWT_PUBLIC_KEY_PATH` | Auth Service |
| `JWT_ALGORITHM` | Auth Service |

## Rollback Plan

If issues are encountered:

1. **Restore keys:** If you backed up the `keys/` folder, restore it
2. **Revert env vars:** Add back `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`
3. **Revert code:** Use git to revert the changes:
   ```bash
   git checkout HEAD~1 -- services/auth-service/src/services/token.service.ts
   git checkout HEAD~1 -- services/auth-service/src/config/config.ts
   git checkout HEAD~1 -- services/gateway/src/plugins/jwt.ts
   git checkout HEAD~1 -- services/gateway/src/utils/jwt-helpers.ts
   git checkout HEAD~1 -- docker-compose.yml
   ```
4. **Rebuild and restart**

## FAQ

**Q: Do I need to regenerate all existing JWT tokens?**
A: Yes. Since the signing algorithm changed from RS256 to HS256, all existing tokens are invalid. Users will need to re-authenticate.

**Q: Can I use the same JWT_SECRET across environments?**
A: No! Each environment (dev, staging, prod) should have a unique, strong secret.

**Q: What if the Auth Service is down?**
A: The gateway will return 503 errors for all authenticated requests. The auth service is a critical dependency.

**Q: How do I generate a strong JWT_SECRET?**
A: Use `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Q: Do downstream services still validate tokens?**
A: No. The gateway validates via Auth Service, then passes trusted context headers (`X-User-Id`, `X-Tenant-Id`, etc.) to downstream services. They trust these headers when `X-Service-Secret` matches.
