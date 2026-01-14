# R&D: API Key Security Best Practices

> **Related Roadmap**: [Client Facing UI](../roadmaps/1_clientFacingUI.md), [Auth & Security](../roadmaps/3_AuthAutorizeSecurity.md)

---

## Executive Summary

This document outlines security best practices for API key generation, storage, transmission, and management in the CAAS platform.

---

## Table of Contents
1. [API Key Design](#1-api-key-design)
2. [Key Generation](#2-key-generation)
3. [Secure Storage](#3-secure-storage)
4. [Secure Transmission](#4-secure-transmission)
5. [Key Rotation](#5-key-rotation)
6. [Access Controls](#6-access-controls)
7. [Monitoring & Revocation](#7-monitoring--revocation)

---

## 1. API Key Design

### 1.1 Key Structure

```
Format: caas_{prefix}_{random}_checksum

Example: caas_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6_4x7z

Components:
├── caas_          → Service identifier (4 chars)
├── live_          → Environment (live, test, dev)
├── sk_            → Key type (sk=secret, pk=public)
├── {random}       → 32-char random string
└── {checksum}     → 4-char checksum
```

### 1.2 Key Types

| Type | Prefix | Usage | Visibility |
|------|--------|-------|------------|
| Secret Key | `sk_` | Server-side API calls | Never expose |
| Public Key | `pk_` | Client-side initialization | Can be in frontend |
| Restricted Key | `rk_` | Limited scope operations | Context-dependent |

### 1.3 Key Identifier (Non-Secret)

```
Key ID: key_a1b2c3d4

- Used for referencing keys in logs/dashboards
- Safe to store in logs
- Maps to full key via lookup
```

---

## 2. Key Generation

### 2.1 Cryptographically Secure Generation

```typescript
import crypto from 'crypto';

interface ApiKey {
  id: string;
  key: string;
  hash: string;
  prefix: string;      // First 8 chars for identification
  createdAt: Date;
  expiresAt: Date | null;
  scopes: string[];
}

function generateApiKey(environment: 'live' | 'test', type: 'sk' | 'pk'): ApiKey {
  // Generate 32 bytes of random data
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes.toString('base64url').slice(0, 32);
  
  // Calculate checksum
  const checksum = crypto
    .createHash('sha256')
    .update(randomString)
    .digest('base64url')
    .slice(0, 4);
  
  // Construct full key
  const key = `caas_${environment}_${type}_${randomString}_${checksum}`;
  
  // Generate key ID
  const keyId = `key_${crypto.randomBytes(4).toString('hex')}`;
  
  // Hash for storage
  const hash = crypto
    .createHash('sha256')
    .update(key)
    .digest('hex');
  
  return {
    id: keyId,
    key: key,          // Only shown once
    hash: hash,        // Stored in database
    prefix: key.slice(0, 16),
    createdAt: new Date(),
    expiresAt: null,
    scopes: []
  };
}
```

### 2.2 Key Validation

```typescript
function validateApiKey(key: string): boolean {
  // Check format
  const pattern = /^caas_(live|test)_(sk|pk|rk)_[A-Za-z0-9_-]{32}_[A-Za-z0-9_-]{4}$/;
  if (!pattern.test(key)) return false;
  
  // Extract and verify checksum
  const parts = key.split('_');
  const randomString = parts[3];
  const providedChecksum = parts[4];
  
  const calculatedChecksum = crypto
    .createHash('sha256')
    .update(randomString)
    .digest('base64url')
    .slice(0, 4);
  
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedChecksum),
    Buffer.from(calculatedChecksum)
  );
}
```

---

## 3. Secure Storage

### 3.1 Database Storage (Server-Side)

```javascript
// MongoDB schema
{
  _id: ObjectId,
  key_id: String,           // key_a1b2c3d4
  client_id: ObjectId,      // Owner
  
  // Security
  hash: String,             // SHA-256 hash of full key
  prefix: String,           // First 16 chars (for display)
  
  // Metadata
  name: String,             // User-given name
  type: String,             // sk, pk, rk
  environment: String,      // live, test
  
  // Access Control
  scopes: [String],         // ['messages:read', 'messages:write']
  ip_whitelist: [String],   // ['192.168.1.0/24']
  
  // Lifecycle
  created_at: Date,
  last_used_at: Date,
  expires_at: Date,
  revoked_at: Date,
  revoked_reason: String,
  
  // Rate limits
  rate_limit: {
    requests_per_minute: Number,
    requests_per_hour: Number
  }
}
```

**Important**: Never store the full API key - only the hash!

### 3.2 Client-Side Storage Guidance

```typescript
// For SAAS developers integrating CAAS

// ❌ NEVER do this
const apiKey = 'caas_live_sk_...'; // Hardcoded

// ❌ NEVER do this
localStorage.setItem('apiKey', 'caas_live_sk_...'); // Browser storage

// ✅ Server-side only
// Store in environment variables
process.env.CAAS_API_KEY

// ✅ For client initialization, use public key only
const caas = new CaasClient({
  publicKey: 'caas_live_pk_...'  // Public key is safe
});
```

---

## 4. Secure Transmission

### 4.1 HTTPS Enforcement

```typescript
// Gateway middleware
function enforceHTTPS(req: Request, res: Response, next: NextFunction) {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.status(403).json({
      error: 'HTTPS required',
      code: 'HTTPS_REQUIRED'
    });
  }
  next();
}
```

### 4.2 API Key in Headers

```http
# Recommended: Authorization header
GET /api/v1/conversations HTTP/1.1
Host: api.caas.io
Authorization: Bearer caas_live_sk_...

# Alternative: Custom header
X-API-Key: caas_live_sk_...

# ❌ NEVER in URL
GET /api/v1/conversations?api_key=caas_live_sk_...  # Bad!
```

### 4.3 Key Display Security

```typescript
// When showing keys in dashboard
function maskApiKey(key: string): string {
  // Show only prefix: caas_live_sk_a1b2...
  return key.slice(0, 16) + '•'.repeat(32);
}

// One-time display for new keys
interface KeyCreationResponse {
  key_id: string;
  key: string;              // Full key - shown only once!
  warning: string;          // "Save this key - it won't be shown again"
  created_at: string;
}
```

---

## 5. Key Rotation

### 5.1 Rotation Strategy

```
Rotation Timeline:
├── Day 0: Generate new key
├── Day 0-7: Transition period (both keys active)
├── Day 7: Old key deprecated (warnings)
├── Day 14: Old key disabled
└── Day 30: Old key deleted
```

### 5.2 Rotation Implementation

```typescript
interface KeyRotationResult {
  new_key: ApiKey;
  old_key_expiry: Date;
  transition_period_days: number;
}

async function rotateApiKey(keyId: string): Promise<KeyRotationResult> {
  const oldKey = await db.apiKeys.findById(keyId);
  
  // Generate new key with same settings
  const newKey = await generateApiKey(oldKey.environment, oldKey.type);
  newKey.scopes = oldKey.scopes;
  newKey.ip_whitelist = oldKey.ip_whitelist;
  newKey.rate_limit = oldKey.rate_limit;
  
  // Set old key expiry
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 14);
  
  await db.apiKeys.update(keyId, {
    expires_at: expiryDate,
    rotation_status: 'deprecated'
  });
  
  // Save new key
  await db.apiKeys.create(newKey);
  
  // Notify via webhook
  await sendWebhook(oldKey.client_id, 'key.rotated', {
    old_key_id: keyId,
    new_key_id: newKey.id,
    old_key_expires: expiryDate
  });
  
  return {
    new_key: newKey,
    old_key_expiry: expiryDate,
    transition_period_days: 14
  };
}
```

### 5.3 Emergency Rotation

```typescript
async function emergencyRevokeKey(keyId: string, reason: string): Promise<void> {
  await db.apiKeys.update(keyId, {
    revoked_at: new Date(),
    revoked_reason: reason,
    status: 'revoked'
  });
  
  // Immediately invalidate in cache
  await redis.del(`apikey:${keyId}`);
  
  // Terminate active sessions using this key
  await terminateKeySession(keyId);
  
  // Send alert
  await alertSecurityTeam({
    type: 'KEY_EMERGENCY_REVOKE',
    key_id: keyId,
    reason: reason
  });
}
```

---

## 6. Access Controls

### 6.1 Scopes & Permissions

```typescript
// Available scopes
const SCOPES = {
  // Message operations
  'messages:read': 'Read messages',
  'messages:write': 'Send messages',
  'messages:delete': 'Delete messages',
  
  // User operations
  'users:read': 'Read user profiles',
  'users:write': 'Manage users',
  
  // Conversation operations
  'conversations:read': 'View conversations',
  'conversations:write': 'Create/update conversations',
  
  // File operations
  'files:read': 'Download files',
  'files:write': 'Upload files',
  
  // Admin operations
  'admin:read': 'View admin data',
  'admin:write': 'Manage settings'
};

// Scope validation
function hasScope(keyScopes: string[], requiredScope: string): boolean {
  // Check exact match
  if (keyScopes.includes(requiredScope)) return true;
  
  // Check wildcard (e.g., 'messages:*')
  const [resource, action] = requiredScope.split(':');
  return keyScopes.includes(`${resource}:*`);
}
```

### 6.2 IP Restrictions

```typescript
// IP whitelist validation
function validateIpAccess(clientIp: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true; // No restrictions
  
  return whitelist.some(pattern => {
    if (pattern.includes('/')) {
      // CIDR range
      return isIpInCidr(clientIp, pattern);
    }
    return clientIp === pattern;
  });
}
```

---

## 7. Monitoring & Revocation

### 7.1 Usage Monitoring

```typescript
// Log all API key usage
interface ApiKeyUsageLog {
  key_id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  ip_address: string;
  user_agent: string;
  response_status: number;
  response_time_ms: number;
}

// Detect anomalies
const anomalyRules = [
  { condition: 'requests_per_minute > 1000', action: 'alert' },
  { condition: 'new_ip_address', action: 'log' },
  { condition: 'after_hours_usage', action: 'alert' },
  { condition: '4xx_error_rate > 50%', action: 'rate_limit' }
];
```

### 7.2 Automatic Revocation Triggers

| Trigger | Action |
|---------|--------|
| > 10,000 failed requests/hour | Temporary suspend |
| Detected in breach database | Immediate revoke |
| Unused for 90 days | Expire notification |
| Excessive scope requests | Alert + review |

---

## Security Checklist

- [ ] Keys generated with CSPRNG
- [ ] Keys stored as hashes only
- [ ] HTTPS enforced for all API calls
- [ ] Keys never logged or exposed
- [ ] Rotation procedures documented
- [ ] Scope restrictions implemented
- [ ] IP whitelisting available
- [ ] Usage monitoring in place
- [ ] Emergency revocation tested
- [ ] Key exposure detection active

---

## References

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Stripe API Key Management](https://stripe.com/docs/keys)
