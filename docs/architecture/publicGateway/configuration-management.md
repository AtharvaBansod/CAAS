# Public Gateway - Configuration Management

> **Parent Roadmap**: [Public Gateway](../../roadmaps/2_publicalllyExposedGateway.md)

---

## Overview

Environment configuration and secrets management for the API gateway.

---

## 1. Configuration Hierarchy

```
┌─────────────────────────────────────────────────┐
│           Environment Variables                  │
│         (Highest priority - secrets)            │
├─────────────────────────────────────────────────┤
│              Config Files                        │
│           (Environment-specific)                 │
├─────────────────────────────────────────────────┤
│            Default Values                        │
│         (Lowest priority - code)                │
└─────────────────────────────────────────────────┘
```

---

## 2. Configuration Schema

```typescript
interface GatewayConfig {
  server: {
    port: number;
    host: string;
    trustProxy: boolean;
  };
  
  cors: {
    origins: string[];
    credentials: boolean;
  };
  
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipPaths: string[];
  };
  
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    apiKeyHeader: string;
  };
  
  redis: {
    url: string;
    clusterMode: boolean;
  };
  
  services: {
    auth: { url: string; timeout: number };
    chat: { url: string; timeout: number };
    billing: { url: string; timeout: number };
  };
  
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
  
  features: {
    enableMetrics: boolean;
    enableTracing: boolean;
    maintenanceMode: boolean;
  };
}
```

---

## 3. Config Loader

```typescript
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment-specific .env
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('0.0.0.0'),
    trustProxy: z.boolean().default(true)
  }),
  redis: z.object({
    url: z.string().url(),
    clusterMode: z.boolean().default(false)
  }),
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('1h')
  })
});

function loadConfig(): GatewayConfig {
  const raw = {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || '0.0.0.0',
      trustProxy: process.env.TRUST_PROXY === 'true'
    },
    redis: {
      url: process.env.REDIS_URL,
      clusterMode: process.env.REDIS_CLUSTER === 'true'
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
    // ... other sections
  };
  
  return configSchema.parse(raw);
}

export const config = loadConfig();
```

---

## 4. Secrets Management

### Using Vault
```typescript
import Vault from 'node-vault';

const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function loadSecrets(): Promise<Secrets> {
  const { data } = await vault.read('secret/data/caas/gateway');
  
  return {
    jwtSecret: data.data.jwt_secret,
    dbPassword: data.data.db_password,
    stripeKey: data.data.stripe_key
  };
}
```

### Using AWS Secrets Manager
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<string> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return response.SecretString!;
}
```

---

## 5. Environment Files

```bash
# .env.development
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
LOG_LEVEL=debug
CORS_ORIGINS=http://localhost:3001

# .env.production
NODE_ENV=production
PORT=8080
REDIS_URL=${REDIS_URL}  # Injected at runtime
LOG_LEVEL=info
CORS_ORIGINS=https://app.caas.io,https://api.caas.io
```

---

## 6. Feature Flags

```typescript
interface FeatureFlags {
  [key: string]: boolean | string | number;
}

class FeatureFlagService {
  private flags: FeatureFlags = {};
  
  async refresh(): Promise<void> {
    // Fetch from config service or Redis
    const remote = await redis.hgetall('feature_flags');
    this.flags = { ...this.flags, ...remote };
  }
  
  isEnabled(flag: string): boolean {
    return this.flags[flag] === true || this.flags[flag] === 'true';
  }
  
  getValue<T>(flag: string, defaultValue: T): T {
    return (this.flags[flag] as T) ?? defaultValue;
  }
}

// Usage
if (featureFlags.isEnabled('new_auth_flow')) {
  return newAuthHandler(req);
}
```

---

## 7. Dynamic Configuration

```typescript
// Watch for config changes
class ConfigWatcher {
  private config: GatewayConfig;
  
  constructor() {
    this.config = loadConfig();
    this.watchForChanges();
  }
  
  private watchForChanges(): void {
    // Subscribe to Redis config channel
    redis.subscribe('config:updates', (message) => {
      const update = JSON.parse(message);
      this.config = { ...this.config, ...update };
      this.emit('configChanged', this.config);
    });
  }
  
  get(): GatewayConfig {
    return this.config;
  }
}
```

---

## Related Documents
- [Security Implementation](./security-implementation.md)
- [Rate Limiting](./rate-limiting.md)
