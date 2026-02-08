# Authentication Service - Quick Start Guide

## Overview

The authentication service provides comprehensive JWT-based authentication with session management and multi-factor authentication.

---

## Quick Setup

### 1. Generate JWT Keys

```bash
# Navigate to gateway directory
cd services/gateway

# Generate RS256 key pair
node generate-keys.js

# Keys will be created in ./keys/ directory
# - private.pem (keep secret!)
# - public.pem (can be shared)
```

### 2. Configure Environment

Create `.env` file in project root:

```env
# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# MongoDB
MONGODB_URI=mongodb://caas_app:caas_app_secret_2026@mongodb-primary:27017
MONGODB_DATABASE=caas_platform

# Kafka
KAFKA_BROKERS=kafka-1:29092,kafka-2:29093,kafka-3:29094
KAFKA_CLIENT_ID=gateway-service

# JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=caas.io
JWT_PRIVATE_KEY_PATH=/app/keys/private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/public.pem

# Session
SESSION_TTL_SECONDS=3600
MAX_SESSIONS_PER_USER=5
SESSION_RENEWAL_COOLDOWN_MS=60000
SESSION_MAX_LIFETIME_SECONDS=86400

# MFA
TOTP_ISSUER=CAAS
BACKUP_CODE_COUNT=10
TRUST_TOKEN_EXPIRY_DAYS=30
MFA_CHALLENGE_TTL_SECONDS=300
MFA_MAX_ATTEMPTS=5
```

### 3. Initialize MongoDB Collections

```bash
# Connect to MongoDB
docker exec -it mongodb-primary mongosh -u caas_admin -p caas_secret_2026 --authenticationDatabase admin

# Switch to platform database
use caas_platform

# Create collections
db.createCollection("user_mfa");
db.user_mfa.createIndex({ user_id: 1 }, { unique: true });

db.createCollection("trusted_devices");
db.trusted_devices.createIndex({ user_id: 1 });
db.trusted_devices.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

db.createCollection("security_events");
db.security_events.createIndex({ user_id: 1, event_type: 1, timestamp: 1 });
```

### 4. Register Plugin in Gateway

Add to `services/gateway/src/app.ts`:

```typescript
import authServicesPlugin from './plugins/auth-services';

// Register plugins
await app.register(authServicesPlugin);
```

### 5. Start Services

```bash
# Start infrastructure
docker-compose up -d redis mongodb-primary kafka-1

# Start gateway
cd services/gateway
npm install
npm run dev
```

---

## Usage Examples

### Using JWT Generator

```typescript
// In a route handler
const jwtGenerator = fastify.authServices.getJWTGenerator();

const tokens = await jwtGenerator.generateAccessToken({
  user: { id: 'user-123', email: 'user@example.com' },
  tenant: { id: 'tenant-456' },
  scopes: ['read:messages', 'write:messages'],
  deviceId: 'device-789',
});

// Returns:
// {
//   access_token: 'eyJhbGc...',
//   refresh_token: 'eyJhbGc...',
//   expires_in: 900,
//   token_type: 'Bearer'
// }
```

### Using JWT Validator

```typescript
const jwtValidator = fastify.authServices.getJWTValidator();

try {
  const payload = await jwtValidator.validate(token);
  console.log('User ID:', payload.sub);
  console.log('Tenant ID:', payload.tenant_id);
  console.log('Scopes:', payload.scopes);
} catch (error) {
  console.error('Token validation failed:', error.message);
}
```

### Managing Sessions

```typescript
const sessionService = fastify.authServices.getSessionService();

// Create session
const session = await sessionService.createSession({
  userId: 'user-123',
  tenantId: 'tenant-456',
  deviceInfo: {
    type: 'web',
    os: 'Windows 10',
    browser: 'Chrome 120',
  },
  ipAddress: '192.168.1.1',
});

// Get user sessions
const sessions = await sessionService.getUserSessions('user-123');

// Terminate session
await sessionService.terminateSession(session.id);
```

### Setting Up TOTP

```typescript
const totpService = fastify.authServices.getTOTPService();

// Generate secret and QR code
const setup = await totpService.generateSecret('user-123');
// Returns: { secret, uri, qr_code }

// Verify token
const isValid = await totpService.verifyToken(setup.secret, '123456');

// Enable TOTP
if (isValid) {
  await totpService.enableTOTP('user-123', setup.secret, '123456');
}
```

### Handling MFA Challenge

```typescript
const mfaChallengeService = fastify.authServices.getMFAChallengeService();

// Create challenge after password verification
const challenge = await mfaChallengeService.createChallenge(
  'user-123',
  'session-456'
);

// Verify challenge response
const result = await mfaChallengeService.verifyChallenge(
  challenge.id,
  'totp',
  '123456'
);

if (result.success) {
  // Complete authentication
  const tokens = await jwtGenerator.generateAccessToken({...});
}
```

### Token Refresh

```typescript
const refreshService = fastify.authServices.getRefreshService();

try {
  const tokens = await refreshService.refresh(refreshToken);
  // Returns new access_token and refresh_token
} catch (error) {
  if (error.message.includes('reuse detected')) {
    // Security breach - all tokens revoked
  }
}
```

### Token Revocation

```typescript
const revocationService = fastify.authServices.getRevocationService();

// Revoke single token
await revocationService.revokeToken(tokenId, RevocationReason.LOGOUT);

// Revoke all user tokens
const count = await revocationService.revokeUserTokens(
  userId,
  RevocationReason.PASSWORD_CHANGE
);

// Revoke all session tokens
await revocationService.revokeSessionTokens(sessionId);
```

---

## API Endpoints

### Authentication
```bash
# Refresh token
POST /v1/auth/refresh
Body: { "refresh_token": "..." }

# Revoke current token
POST /v1/auth/revoke
Headers: Authorization: Bearer <token>

# Revoke all tokens
POST /v1/auth/revoke-all
Headers: Authorization: Bearer <token>
Body: { "password": "..." }
```

### Sessions
```bash
# List sessions
GET /v1/sessions
Headers: Authorization: Bearer <token>

# Terminate session
DELETE /v1/sessions/:id
Headers: Authorization: Bearer <token>

# Terminate all sessions
POST /v1/sessions/terminate-all
Headers: Authorization: Bearer <token>

# Terminate other sessions
POST /v1/sessions/terminate-others
Headers: Authorization: Bearer <token>
```

### MFA - TOTP
```bash
# Setup TOTP
POST /v1/mfa/totp/setup
Headers: Authorization: Bearer <token>

# Verify and enable
POST /v1/mfa/totp/verify
Headers: Authorization: Bearer <token>
Body: { "secret": "...", "token": "123456" }

# Disable TOTP
DELETE /v1/mfa/totp/disable
Headers: Authorization: Bearer <token>
```

### MFA - Backup Codes
```bash
# Get remaining count
GET /v1/mfa/backup-codes
Headers: Authorization: Bearer <token>

# Regenerate codes
POST /v1/mfa/backup-codes/regenerate
Headers: Authorization: Bearer <token>
```

### MFA - Trusted Devices
```bash
# List trusted devices
GET /v1/mfa/trusted-devices
Headers: Authorization: Bearer <token>

# Remove device trust
DELETE /v1/mfa/trusted-devices/:id
Headers: Authorization: Bearer <token>

# Remove all trust
DELETE /v1/mfa/trusted-devices
Headers: Authorization: Bearer <token>
```

### MFA - Challenge
```bash
# Verify MFA
POST /v1/auth/mfa/challenge
Body: {
  "challenge_id": "...",
  "method": "totp",
  "response": "123456",
  "trust_device": true
}

# Switch method
POST /v1/auth/mfa/switch-method
Body: { "challenge_id": "...", "method": "backup_code" }

# Get available methods
GET /v1/auth/mfa/methods?user_id=...
```

---

## Testing

### Manual Testing with curl

```bash
# 1. Login (get tokens)
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Use access token
curl http://localhost:3000/v1/sessions \
  -H "Authorization: Bearer <access_token>"

# 3. Refresh token
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'

# 4. Setup TOTP
curl -X POST http://localhost:3000/v1/mfa/totp/setup \
  -H "Authorization: Bearer <access_token>"

# 5. Verify TOTP
curl -X POST http://localhost:3000/v1/mfa/totp/verify \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<secret>","token":"123456"}'
```

### Using Swagger UI

Navigate to `http://localhost:3000/docs` to use the interactive API documentation.

---

## Troubleshooting

### Token Validation Fails

**Problem:** `TokenSignatureError` or `TokenExpiredError`

**Solutions:**
- Check JWT keys are correctly mounted
- Verify JWT_ALGORITHM matches key type
- Check system time synchronization
- Verify token hasn't been revoked

### Redis Connection Error

**Problem:** `ECONNREFUSED` or `Connection timeout`

**Solutions:**
- Verify Redis is running: `docker ps | grep redis`
- Check Redis host/port in environment variables
- Test connection: `docker exec -it redis redis-cli ping`

### MongoDB Connection Error

**Problem:** `MongoServerError` or `Authentication failed`

**Solutions:**
- Verify MongoDB is running: `docker ps | grep mongodb`
- Check MongoDB URI and credentials
- Verify database exists: `docker exec -it mongodb-primary mongosh`

### MFA Not Working

**Problem:** TOTP codes not validating

**Solutions:**
- Check system time is synchronized (TOTP is time-based)
- Verify TOTP window configuration
- Test with multiple codes
- Check secret is correctly stored

---

## Performance Tips

1. **Redis Connection Pooling:** Already configured in factory
2. **Token Caching:** Validation results cached in Redis
3. **Session Cleanup:** Runs automatically every 5 minutes
4. **Batch Operations:** Use bulk revocation for multiple tokens

---

## Security Best Practices

1. **Never log tokens:** Tokens contain sensitive information
2. **Use HTTPS:** Always use TLS in production
3. **Rotate keys:** Implement key rotation schedule
4. **Monitor failures:** Set up alerts for authentication failures
5. **Rate limiting:** Already implemented in gateway
6. **Audit logging:** All security events are logged

---

## Next Steps

1. ✅ Complete infrastructure integration
2. ✅ Write unit tests
3. ✅ Write integration tests
4. ✅ Set up monitoring
5. ✅ Deploy to staging
6. ✅ Load testing
7. ✅ Production deployment

---

## Support

For issues or questions:
- Check `IMPLEMENTATION_STATUS.md` for current status
- Review `AUTHENTICATION_IMPLEMENTATION_COMPLETE.md` for architecture details
- Check logs: `docker-compose logs gateway`
