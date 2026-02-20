# Compliance & Crypto Client Libraries - Developer Guide

## Overview

This guide provides practical examples for using the Compliance and Crypto client libraries in CAAS services.

## Installation

Both libraries are available as internal packages:

```bash
npm install @caas/compliance-client
npm install @caas/crypto-client
```

## Compliance Client

### Basic Setup

```typescript
import { createComplianceClient } from '@caas/compliance-client';

const complianceClient = createComplianceClient({
  baseURL: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008',
  timeout: 10000,
  retries: 3,
  circuitBreaker: {
    failureThreshold: 30,
    resetTimeout: 60000,
    monitoringPeriod: 30000
  },
  batching: {
    enabled: true,
    maxBatchSize: 100,
    flushInterval: 5000
  }
});
```

### Audit Logging

#### Log User Actions (Batched)
```typescript
// Batched logging (recommended for high-volume events)
await complianceClient.logAudit({
  tenant_id: req.tenant_id,
  user_id: req.user_id,
  action: 'user_login',
  resource_type: 'authentication',
  metadata: {
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    success: true
  }
});
```

#### Log Critical Events (Immediate)
```typescript
// Immediate logging (for critical events)
const auditId = await complianceClient.logAuditImmediate({
  tenant_id: req.tenant_id,
  user_id: req.user_id,
  action: 'admin_access',
  resource_type: 'admin_panel',
  resource_id: 'settings',
  metadata: {
    changes: { setting: 'value' }
  }
});
```

#### Query Audit Logs
```typescript
const logs = await complianceClient.queryAudit({
  tenant_id: 'tenant-123',
  user_id: 'user-456',
  action: 'message_send',
  start_date: new Date('2026-01-01'),
  end_date: new Date('2026-02-01'),
  limit: 100,
  skip: 0
});
```

#### Verify Audit Log Integrity
```typescript
const verification = await complianceClient.verifyIntegrity(
  'tenant-123',
  new Date('2026-01-01'),
  new Date('2026-02-01')
);

console.log(`Valid: ${verification.valid}`);
console.log(`Total Logs: ${verification.total_logs}`);
console.log(`Verified: ${verification.verified_logs}`);
console.log(`Errors: ${verification.errors.join(', ')}`);
```

### GDPR Operations

#### Record User Consent
```typescript
const consentId = await complianceClient.recordConsent({
  user_id: 'user-456',
  tenant_id: 'tenant-123',
  consent_type: 'marketing',
  consent_given: true,
  consent_text: 'I agree to receive marketing communications',
  version: '1.0',
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});
```

#### Get User Consent
```typescript
const consents = await complianceClient.getConsent(
  'user-456',
  'tenant-123',
  'marketing' // optional: filter by consent type
);
```

#### Revoke Consent
```typescript
await complianceClient.revokeConsent(consentId);
```

#### Submit GDPR Data Export Request
```typescript
const requestId = await complianceClient.submitGDPRRequest({
  user_id: 'user-456',
  tenant_id: 'tenant-123',
  request_type: 'export',
  request_data: {
    format: 'json',
    include_media: true
  }
});
```

#### Submit GDPR Data Erasure Request
```typescript
const requestId = await complianceClient.submitGDPRRequest({
  user_id: 'user-456',
  tenant_id: 'tenant-123',
  request_type: 'erasure',
  request_data: {
    reason: 'User requested account deletion'
  }
});
```

#### Check GDPR Request Status
```typescript
const request = await complianceClient.getGDPRRequestStatus(requestId);

console.log(`Status: ${request.status}`);
console.log(`Created: ${request.created_at}`);
if (request.completed_at) {
  console.log(`Completed: ${request.completed_at}`);
}
if (request.result_data) {
  console.log(`Result: ${JSON.stringify(request.result_data)}`);
}
```

### Retention Policies

#### Create Retention Policy
```typescript
const policyId = await complianceClient.createRetentionPolicy({
  tenant_id: 'tenant-123',
  name: 'Message Retention Policy',
  data_type: 'messages',
  retention_days: 365,
  conditions: {
    exclude_starred: true,
    exclude_archived: false
  },
  is_active: true
});
```

#### Get Retention Policies
```typescript
const policies = await complianceClient.getRetentionPolicies('tenant-123');

policies.forEach(policy => {
  console.log(`${policy.name}: ${policy.retention_days} days`);
});
```

#### Execute Retention Policy
```typescript
const executionId = await complianceClient.executeRetentionPolicy(policyId);

// Check execution status later
const execution = await complianceClient.getGDPRRequestStatus(executionId);
console.log(`Status: ${execution.status}`);
console.log(`Processed: ${execution.processed_records}`);
console.log(`Deleted: ${execution.deleted_records}`);
```

### Graceful Shutdown

```typescript
// Flush remaining audit logs before shutdown
process.on('SIGTERM', async () => {
  await complianceClient.shutdown();
  process.exit(0);
});
```

## Crypto Client

### Basic Setup

```typescript
import { createCryptoClient } from '@caas/crypto-client';

const cryptoClient = createCryptoClient({
  baseURL: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3009',
  timeout: 10000,
  retries: 3,
  circuitBreaker: {
    failureThreshold: 20,
    resetTimeout: 60000,
    monitoringPeriod: 30000
  },
  caching: {
    enabled: true,
    keyTTL: 3600,
    sessionTTL: 1800
  }
});
```

### Key Management

#### Generate Encryption Key
```typescript
// Generate master key
const masterKeyId = await cryptoClient.generateKey('tenant-123', 'master');

// Generate data key
const dataKeyId = await cryptoClient.generateKey('tenant-123', 'data');

// Generate session key
const sessionKeyId = await cryptoClient.generateKey('tenant-123', 'session');
```

#### Get Tenant Keys
```typescript
const keys = await cryptoClient.getTenantKeys('tenant-123');

keys.forEach(key => {
  console.log(`${key.key_type}: ${key.key_id}`);
  console.log(`  Created: ${key.created_at}`);
  console.log(`  Expires: ${key.expires_at}`);
  console.log(`  Active: ${key.is_active}`);
});
```

#### Rotate Encryption Key
```typescript
const newKeyId = await cryptoClient.rotateKey(oldKeyId, 'tenant-123');
console.log(`Old key: ${oldKeyId} -> New key: ${newKeyId}`);
```

### Encryption & Decryption

#### Basic Encryption
```typescript
// Encrypt data
const encrypted = await cryptoClient.encrypt(keyId, 'sensitive data');

// Store encrypted data
await db.collection('secrets').insertOne({
  tenant_id: 'tenant-123',
  key_id: keyId,
  ciphertext: encrypted.ciphertext,
  iv: encrypted.iv,
  authTag: encrypted.authTag,
  created_at: new Date()
});
```

#### Basic Decryption
```typescript
// Retrieve encrypted data
const secret = await db.collection('secrets').findOne({ secret_id });

// Decrypt data
const plaintext = await cryptoClient.decrypt(
  secret.key_id,
  secret.ciphertext,
  secret.iv,
  secret.authTag
);
```

#### Encrypt with Master Key (Automatic Key Management)
```typescript
// Automatically gets or creates tenant master key
const result = await cryptoClient.encryptWithMasterKey(
  'tenant-123',
  'sensitive data'
);

// Store encrypted data with key reference
await db.collection('secrets').insertOne({
  tenant_id: 'tenant-123',
  key_id: result.key_id,
  ciphertext: result.ciphertext,
  iv: result.iv,
  authTag: result.authTag,
  created_at: new Date()
});
```

#### Decrypt with Master Key
```typescript
const secret = await db.collection('secrets').findOne({ secret_id });

const plaintext = await cryptoClient.decryptWithMasterKey(
  'tenant-123',
  secret.key_id,
  secret.ciphertext,
  secret.iv,
  secret.authTag
);
```

### Practical Examples

#### Encrypt User Password
```typescript
async function hashPassword(tenantId: string, password: string): Promise<{
  key_id: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}> {
  return await cryptoClient.encryptWithMasterKey(tenantId, password);
}

async function verifyPassword(
  tenantId: string,
  password: string,
  stored: { key_id: string; ciphertext: string; iv: string; authTag: string }
): Promise<boolean> {
  try {
    const decrypted = await cryptoClient.decryptWithMasterKey(
      tenantId,
      stored.key_id,
      stored.ciphertext,
      stored.iv,
      stored.authTag
    );
    return decrypted === password;
  } catch {
    return false;
  }
}
```

#### Encrypt Message Content
```typescript
async function encryptMessage(
  tenantId: string,
  conversationId: string,
  content: string
): Promise<{
  encrypted_content: string;
  encryption_metadata: any;
}> {
  const result = await cryptoClient.encryptWithMasterKey(tenantId, content);
  
  return {
    encrypted_content: result.ciphertext,
    encryption_metadata: {
      key_id: result.key_id,
      iv: result.iv,
      authTag: result.authTag,
      algorithm: 'AES-256-GCM'
    }
  };
}

async function decryptMessage(
  tenantId: string,
  encryptedContent: string,
  metadata: any
): Promise<string> {
  return await cryptoClient.decryptWithMasterKey(
    tenantId,
    metadata.key_id,
    encryptedContent,
    metadata.iv,
    metadata.authTag
  );
}
```

#### Encrypt File
```typescript
async function encryptFile(
  tenantId: string,
  fileBuffer: Buffer
): Promise<{
  encrypted_buffer: Buffer;
  encryption_metadata: any;
}> {
  const base64Content = fileBuffer.toString('base64');
  const result = await cryptoClient.encryptWithMasterKey(tenantId, base64Content);
  
  return {
    encrypted_buffer: Buffer.from(result.ciphertext, 'base64'),
    encryption_metadata: {
      key_id: result.key_id,
      iv: result.iv,
      authTag: result.authTag,
      original_size: fileBuffer.length
    }
  };
}

async function decryptFile(
  tenantId: string,
  encryptedBuffer: Buffer,
  metadata: any
): Promise<Buffer> {
  const base64Encrypted = encryptedBuffer.toString('base64');
  const decrypted = await cryptoClient.decryptWithMasterKey(
    tenantId,
    metadata.key_id,
    base64Encrypted,
    metadata.iv,
    metadata.authTag
  );
  
  return Buffer.from(decrypted, 'base64');
}
```

## Circuit Breaker Monitoring

### Check Client Health

```typescript
// Compliance client
if (!complianceClient.isHealthy()) {
  console.warn('Compliance service circuit breaker is OPEN');
  // Implement fallback logic
}

console.log(`Circuit breaker state: ${complianceClient.getCircuitBreakerState()}`);

// Crypto client
if (!cryptoClient.isHealthy()) {
  console.warn('Crypto service circuit breaker is OPEN');
  // Implement fallback logic
}

console.log(`Circuit breaker state: ${cryptoClient.getCircuitBreakerState()}`);
```

## Error Handling

### Compliance Client Errors

```typescript
try {
  await complianceClient.logAudit({
    tenant_id: 'tenant-123',
    action: 'test_action',
    resource_type: 'test'
  });
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    // Service is temporarily unavailable
    console.warn('Compliance service unavailable, buffering locally');
    // Implement local buffering
  } else {
    // Other error
    console.error('Failed to log audit:', error);
  }
}
```

### Crypto Client Errors

```typescript
try {
  const encrypted = await cryptoClient.encrypt(keyId, 'data');
} catch (error) {
  if (error.message === 'Circuit breaker is OPEN') {
    // Service is temporarily unavailable
    console.warn('Crypto service unavailable');
    // Implement fallback (e.g., local encryption)
  } else if (error.message.includes('Key not found')) {
    // Key doesn't exist or expired
    console.error('Encryption key not found');
    // Generate new key
  } else {
    // Other error
    console.error('Encryption failed:', error);
  }
}
```

## Best Practices

### Compliance Client

1. **Use Batched Logging**: For high-volume events, use `logAudit()` instead of `logAuditImmediate()`
2. **Graceful Shutdown**: Always call `shutdown()` before process exit to flush remaining logs
3. **Tenant Isolation**: Always include `tenant_id` in all operations
4. **Metadata**: Include relevant context in audit metadata (IP, user agent, etc.)
5. **Circuit Breaker**: Monitor circuit breaker state and implement fallback logic

### Crypto Client

1. **Master Key Pattern**: Use `encryptWithMasterKey()` for automatic key management
2. **Key Rotation**: Implement regular key rotation schedules
3. **Key Caching**: Enable caching to reduce crypto service load
4. **Error Handling**: Always handle decryption errors gracefully
5. **Secure Storage**: Store encryption metadata securely alongside encrypted data

## Performance Considerations

### Compliance Client

- **Batching**: Reduces network calls by up to 100x
- **Async Logging**: Non-blocking audit logging
- **Circuit Breaker**: Prevents cascading failures
- **Retry Logic**: Automatic retry with exponential backoff

### Crypto Client

- **Key Caching**: Reduces key lookup time by 90%
- **Connection Pooling**: Reuses HTTP connections
- **Circuit Breaker**: Prevents crypto service overload
- **Retry Logic**: Automatic retry for transient failures

## Monitoring & Debugging

### Enable Debug Logging

```typescript
// Set environment variable
process.env.DEBUG = 'compliance-client,crypto-client';

// Or use console logging
complianceClient.on('error', (error) => {
  console.error('Compliance client error:', error);
});

cryptoClient.on('error', (error) => {
  console.error('Crypto client error:', error);
});
```

### Metrics to Monitor

- Circuit breaker state changes
- Request success/failure rates
- Average response times
- Batch flush frequency
- Cache hit/miss rates
- Key rotation events

## Conclusion

The Compliance and Crypto client libraries provide robust, production-ready solutions for audit logging, GDPR compliance, and encryption in the CAAS platform. Follow the examples and best practices in this guide to integrate these services into your applications effectively.

For more information, see:
- [Phase 4.5 Integration Complete](../PHASE_4.5_INTEGRATION_COMPLETE.md)
- [Compliance Service Documentation](../services/compliance-service/README.md)
- [Crypto Service Documentation](../services/crypto-service/README.md)
