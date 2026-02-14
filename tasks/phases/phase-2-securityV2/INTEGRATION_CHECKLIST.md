# Phase 2 Security V2 - Integration Checklist

This document provides step-by-step instructions for integrating all Phase 2 Security V2 components into the CAAS platform.

---

## Prerequisites

- [ ] All services running in Docker
- [ ] MongoDB replica set operational
- [ ] Redis available
- [ ] Kafka cluster running

---

## 1. Socket Service Integration

### 1.1 Install Dependencies
```powershell
cd services/socket-service
npm install axios ioredis
```

### 1.2 Update chat.ts Namespace

**File:** `services/socket-service/src/namespaces/chat.ts`

Add imports:
```typescript
import { PreKeyBundleManager, E2EKeyExchange, SessionKeyManager, GroupEncryption, GroupKeyAnnouncement } from '../e2e';
import { DeviceSync } from '../sessions/device-sync';
```

Initialize managers in setup:
```typescript
// E2E Encryption Managers
const bundleManager = new PreKeyBundleManager({
  redis,
  cryptoServiceUrl: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3001',
  cacheTTL: parseInt(process.env.PREKEY_BUNDLE_CACHE_TTL || '3600'),
  rateLimitPerMinute: parseInt(process.env.PREKEY_BUNDLE_RATE_LIMIT || '10'),
  logger,
});

const keyExchange = new E2EKeyExchange(bundleManager, logger);

const sessionKeyManager = new SessionKeyManager({
  redis,
  logger,
  sessionKeyLifetimeHours: parseInt(process.env.SESSION_KEY_LIFETIME_HOURS || '168'),
  rotationThreshold: parseInt(process.env.SESSION_ROTATION_THRESHOLD || '1000'),
});

const groupEncryption = new GroupEncryption({
  redis,
  logger,
  rotationIntervalHours: parseInt(process.env.SENDER_KEY_ROTATION_INTERVAL_HOURS || '168'),
});

const groupKeyAnnouncement = new GroupKeyAnnouncement({
  groupEncryption,
  logger,
});

// Session Sync Manager
const deviceSync = new DeviceSync({
  redis,
  logger,
});
```

Register socket events:
```typescript
// E2E Encryption Events
socket.on('e2e:request_prekey_bundle', (data) => 
  keyExchange.handleRequestPreKeyBundle(socket, data)
);

socket.on('e2e:publish_prekey_bundle', (data) => 
  keyExchange.handlePublishPreKeyBundle(socket, data)
);

socket.on('e2e:x3dh_initiate', (data) => 
  keyExchange.handleX3DHInitiation(socket, io, data)
);

socket.on('e2e:x3dh_respond', (data) => 
  keyExchange.handleX3DHResponse(socket, io, data)
);

// Session Sync Events
socket.on('session:sync_request', () => 
  deviceSync.handleSyncRequest(socket, io)
);

// Register socket for sync on connection
await deviceSync.registerSocket(socket, socket.data.userId);

// Cleanup on disconnect
socket.on('disconnect', async () => {
  await deviceSync.unregisterSocket(socket);
});
```

---

## 2. Crypto Service Integration

### 2.1 Update index.ts

**File:** `services/crypto-service/src/index.ts`

Add imports:
```typescript
import { PreKeyBundleApi } from './distribution/prekey-bundle-api';
import { MongoClient } from 'mongodb';
```

Initialize and start API:
```typescript
// Connect to MongoDB
const mongoClient = await MongoClient.connect(process.env.MONGO_URL || 'mongodb://localhost:27017');
const db = mongoClient.db('crypto');

// Initialize Pre-Key Bundle API
const prekeyApi = new PreKeyBundleApi({
  db,
  logger,
  port: parseInt(process.env.CRYPTO_SERVICE_PORT || '3001'),
});

await prekeyApi.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prekeyApi.stop();
  await mongoClient.close();
  process.exit(0);
});
```

### 2.2 Add Dockerfile

**File:** `services/crypto-service/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

---

## 3. Gateway Integration

### 3.1 Install Dependencies
```powershell
cd services/gateway
npm install otplib
```

### 3.2 Register MFA Plugin

**File:** `services/gateway/src/app.ts`

Add imports:
```typescript
import { mfaEnforcementPlugin } from './middleware/mfa/mfa-enforcement';
```

Register plugin:
```typescript
// Register MFA enforcement plugin
await fastify.register(mfaEnforcementPlugin);
```

### 3.3 Register Routes

**File:** `services/gateway/src/routes/v1/index.ts`

Add imports:
```typescript
import { sessionsRoutes } from './sessions';
import { mfaRoutes } from './mfa';
```

Register routes:
```typescript
export default async function v1Routes(fastify: FastifyInstance) {
  // ... existing routes ...
  
  // Session management routes
  await fastify.register(sessionsRoutes);
  
  // MFA routes
  await fastify.register(mfaRoutes);
}
```

**File:** `services/gateway/src/routes/v1/admin/index.ts`

Add imports:
```typescript
import { adminSessionsRoutes } from './sessions';
import { adminMFARoutes } from './mfa';
```

Register routes:
```typescript
export default async function adminRoutes(fastify: FastifyInstance) {
  // ... existing routes ...
  
  // Admin session management
  await fastify.register(adminSessionsRoutes);
  
  // Admin MFA configuration
  await fastify.register(adminMFARoutes);
}
```

### 3.4 Add Fastify Decorators

**File:** `services/gateway/src/app.ts`

Add type declarations:
```typescript
declare module 'fastify' {
  interface FastifyInstance {
    sessionStore: any;
    revocationService: any;
    deviceSync: any;
    mfaEnforcement: any;
    auditLogger: any;
    requireAdmin: any;
  }
}
```

---

## 4. Auth Service Integration

### 4.1 Update Revocation Service

**File:** `services/auth-service/src/revocation/revocation-service.ts`

Add broadcast method:
```typescript
async revokeSession(sessionId: string, userId: string, reason: string): Promise<void> {
  // Existing revocation logic...
  
  // Broadcast revocation event
  await this.redis.publish(
    `session:sync:${userId}`,
    JSON.stringify({
      type: 'session_invalidated',
      userId,
      sessionId,
      reason,
      timestamp: Date.now(),
    })
  );
}
```

---

## 5. Database Setup

### 5.1 Create MongoDB Indexes

**File:** `services/mongodb-service/src/indexes/crypto-indexes.ts`

```typescript
export async function createCryptoIndexes(db: Db): Promise<void> {
  // Pre-key bundles
  await db.collection('prekey_bundles').createIndex(
    { user_id: 1, created_at: 1 },
    { background: true }
  );

  // E2E Sessions
  await db.collection('sessions').createIndex(
    { conversationId: 1, userId: 1 },
    { unique: true, background: true }
  );
  
  await db.collection('sessions').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );

  // Sender Keys
  await db.collection('sender_keys').createIndex(
    { conversationId: 1, userId: 1 },
    { unique: true, background: true }
  );
  
  await db.collection('sender_keys').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true }
  );
}
```

### 5.2 Update Tenant Schema

**File:** `services/mongodb-service/src/schemas/platform/tenant.schema.ts`

Add MFA config:
```typescript
export interface TenantSchema {
  // ... existing fields ...
  
  mfa_config?: {
    level: 'OPTIONAL' | 'RECOMMENDED' | 'REQUIRED' | 'ADMIN_ONLY';
    methods: string[];
    trustedDeviceDays: number;
    gracePeriodDays: number;
    exemptUsers: string[];
  };
}
```

### 5.3 Create Migration Script

**File:** `services/mongodb-service/src/migrations/add-mfa-config.ts`

```typescript
export async function addMFAConfigToTenants(db: Db): Promise<void> {
  await db.collection('saas_clients').updateMany(
    { mfa_config: { $exists: false } },
    {
      $set: {
        mfa_config: {
          level: 'OPTIONAL',
          methods: ['totp', 'backup_code'],
          trustedDeviceDays: 30,
          gracePeriodDays: 7,
          exemptUsers: [],
        },
      },
    }
  );
}
```

---

## 6. Environment Variables

### 6.1 Update .env Files

**services/socket-service/.env:**
```env
PREKEY_BUNDLE_CACHE_TTL=3600
PREKEY_BUNDLE_RATE_LIMIT=10
SESSION_KEY_LIFETIME_HOURS=168
SESSION_ROTATION_THRESHOLD=1000
SENDER_KEY_ROTATION_INTERVAL_HOURS=168
SESSION_SYNC_TIMEOUT_MS=5000
CRYPTO_SERVICE_URL=http://crypto-service:3001
```

**services/gateway/.env:**
```env
MFA_SESSION_TTL_MINUTES=30
```

**services/crypto-service/.env:**
```env
CRYPTO_SERVICE_PORT=3001
MONGO_URL=mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/crypto?replicaSet=caas-rs
```

### 6.2 Update docker-compose.yml

Add crypto-service:
```yaml
crypto-service:
  build:
    context: ./services/crypto-service
    dockerfile: Dockerfile
  container_name: caas-crypto-service
  environment:
    - NODE_ENV=production
    - CRYPTO_SERVICE_PORT=3001
    - MONGO_URL=mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017,mongodb-secondary1:27017,mongodb-secondary2:27017/crypto?replicaSet=caas-rs
  ports:
    - "3001:3001"
  networks:
    - caas-network
  depends_on:
    - mongodb-primary
    - redis
```

Update socket-service environment:
```yaml
socket-service:
  environment:
    # ... existing vars ...
    - CRYPTO_SERVICE_URL=http://crypto-service:3001
    - PREKEY_BUNDLE_CACHE_TTL=3600
    - PREKEY_BUNDLE_RATE_LIMIT=10
    - SESSION_KEY_LIFETIME_HOURS=168
    - SESSION_ROTATION_THRESHOLD=1000
    - SENDER_KEY_ROTATION_INTERVAL_HOURS=168
    - SESSION_SYNC_TIMEOUT_MS=5000
```

Update gateway environment:
```yaml
gateway:
  environment:
    # ... existing vars ...
    - MFA_SESSION_TTL_MINUTES=30
```

---

## 7. Testing Setup

### 7.1 Update Package.json

**services/auth-service/package.json:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run tests/integration",
    "test:multi-device": "vitest run tests/integration/multi-device.test.ts"
  }
}
```

**services/gateway/package.json:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest run tests/integration",
    "test:sessions": "vitest run tests/integration/session-revocation.test.ts",
    "test:mfa": "vitest run tests/integration/mfa-enforcement.test.ts tests/integration/tenant-mfa.test.ts"
  }
}
```

---

## 8. Verification Steps

### 8.1 Build and Start Services
```powershell
# Rebuild services
docker compose build crypto-service socket-service gateway

# Start all services
docker compose up -d

# Check logs
docker compose logs -f crypto-service
docker compose logs -f socket-service
docker compose logs -f gateway
```

### 8.2 Verify Crypto Service
```powershell
# Check health
curl http://localhost:3001/health

# Should return: {"status":"ok","service":"crypto-service"}
```

### 8.3 Verify Gateway Routes
```powershell
# Check Swagger docs
curl http://localhost:3000/docs

# Should include new routes:
# - /v1/sessions
# - /v1/mfa/*
# - /v1/admin/sessions
# - /v1/admin/tenant/mfa
```

### 8.4 Run Tests
```powershell
# Auth service tests
cd services/auth-service
npm run test:integration

# Gateway tests
cd services/gateway
npm run test:sessions
npm run test:mfa
```

---

## 9. Post-Integration Tasks

- [ ] Run database migrations
- [ ] Update API documentation
- [ ] Create user guides for MFA setup
- [ ] Configure monitoring and alerts
- [ ] Perform security audit
- [ ] Load testing
- [ ] Update deployment scripts

---

## 10. Rollback Plan

If issues occur:

1. **Stop new services:**
   ```powershell
   docker compose stop crypto-service
   ```

2. **Revert code changes:**
   ```powershell
   git revert <commit-hash>
   ```

3. **Restart services:**
   ```powershell
   docker compose up -d
   ```

4. **Verify system stability:**
   ```powershell
   .\tests\system\test-system.ps1
   ```

---

## Completion Checklist

### Code Integration
- [ ] Socket service updated
- [ ] Crypto service configured
- [ ] Gateway routes registered
- [ ] Auth service updated
- [ ] Database indexes created
- [ ] Environment variables added

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Load tests pass

### Documentation
- [ ] API docs updated
- [ ] Integration guide complete
- [ ] User guides created

### Deployment
- [ ] Docker Compose updated
- [ ] Services deployed
- [ ] Monitoring configured
- [ ] Alerts configured

---

## Support

For issues during integration:
1. Check service logs: `docker compose logs -f <service>`
2. Verify environment variables
3. Check database connections
4. Review IMPLEMENTATION_SUMMARY.md
5. Consult TASK_COMPLETION_STATUS.md

---

**Integration Status:** Ready for implementation
**Estimated Time:** 4-6 hours
**Risk Level:** Medium (requires careful testing)
