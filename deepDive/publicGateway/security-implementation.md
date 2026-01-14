# Public Gateway - Security Implementation

> **Parent Roadmap**: [Public Gateway](../../roadmaps/2_publicalllyExposedGateway.md)

---

## Overview

Comprehensive security layer for the API gateway, protecting all incoming requests and ensuring tenant isolation.

---

## Tasks

### 1. Request Authentication

#### 1.1 API Key Authentication
```typescript
// API Key validation middleware
async function validateApiKey(req: Request): Promise<TenantContext> {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    throw new UnauthorizedError('API key required');
  }
  
  // Hash and lookup
  const hashedKey = hashApiKey(apiKey);
  const keyRecord = await redis.get(`apikey:${hashedKey}`);
  
  if (!keyRecord) {
    // Check database and cache
    const dbRecord = await db.apiKeys.findByHash(hashedKey);
    if (!dbRecord) {
      throw new UnauthorizedError('Invalid API key');
    }
    await redis.setex(`apikey:${hashedKey}`, 300, JSON.stringify(dbRecord));
    return dbRecord.tenantContext;
  }
  
  return JSON.parse(keyRecord);
}
```
- [ ] API key header extraction
- [ ] Key hashing (SHA-256)
- [ ] Key lookup (Redis cache → MongoDB)
- [ ] Key validation and expiry check
- [ ] Tenant context extraction
- [ ] Key usage tracking

#### 1.2 JWT Token Authentication
```typescript
// JWT validation for end-user requests
async function validateJwt(token: string): Promise<UserContext> {
  try {
    const decoded = await jose.jwtVerify(token, publicKey, {
      issuer: 'caas',
      audience: 'caas-api'
    });
    
    // Additional checks
    if (decoded.payload.revoked) {
      throw new UnauthorizedError('Token revoked');
    }
    
    return {
      userId: decoded.payload.sub,
      tenantId: decoded.payload.tenant_id,
      permissions: decoded.payload.permissions
    };
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new TokenExpiredError();
    }
    throw new UnauthorizedError('Invalid token');
  }
}
```
- [ ] JWT extraction from Authorization header
- [ ] Signature verification (RS256)
- [ ] Claims validation (iss, aud, exp)
- [ ] Token revocation check
- [ ] User context extraction

#### 1.3 OAuth Token Validation
- [ ] OAuth provider token introspection
- [ ] Token caching
- [ ] User info extraction
- [ ] Provider-specific handling

### 2. Request Authorization

#### 2.1 Permission Checking
```typescript
// Check if user has permission for action
async function checkPermission(
  userContext: UserContext,
  resource: string,
  action: string
): Promise<boolean> {
  const policy = await policyEngine.evaluate({
    subject: {
      userId: userContext.userId,
      role: userContext.role,
      tenantId: userContext.tenantId
    },
    resource: {
      type: resource,
      id: req.params.resourceId,
      tenantId: req.params.tenantId
    },
    action: action,
    context: {
      ip: req.ip,
      time: new Date()
    }
  });
  
  return policy.allowed;
}
```
- [ ] Role extraction from token
- [ ] Permission mapping
- [ ] Resource-level authorization
- [ ] Action-level authorization
- [ ] Policy engine integration

#### 2.2 Tenant Isolation
- [ ] Tenant ID extraction from request
- [ ] Tenant ID validation against token
- [ ] Cross-tenant access prevention
- [ ] Tenant quota checking
- [ ] Tenant status verification (active, suspended)

### 3. IP Security

#### 3.1 IP Whitelist Enforcement
```typescript
// IP whitelist check
async function checkIpWhitelist(
  tenantId: string,
  clientIp: string
): Promise<boolean> {
  const whitelist = await redis.smembers(`ip:whitelist:${tenantId}`);
  
  if (whitelist.length === 0) {
    // No whitelist configured = allow all
    return true;
  }
  
  return whitelist.some(pattern => {
    if (pattern.includes('/')) {
      // CIDR range
      return ipRangeCheck(clientIp, pattern);
    }
    return clientIp === pattern;
  });
}
```
- [ ] IP extraction (X-Forwarded-For handling)
- [ ] Whitelist lookup per tenant
- [ ] CIDR range matching
- [ ] Whitelist caching
- [ ] Whitelist bypass for emergencies

#### 3.2 IP Blacklist
- [ ] Global blacklist (known bad actors)
- [ ] Tenant-specific blacklist
- [ ] Automatic blacklisting on abuse
- [ ] Blacklist expiration
- [ ] Blacklist management API

#### 3.3 Geo-Blocking
- [ ] GeoIP lookup integration
- [ ] Country-based blocking
- [ ] Region allowlist per tenant
- [ ] Geo-blocking override

### 4. Attack Prevention

#### 4.1 Input Validation
```typescript
// Request validation schema
const messageSchema = z.object({
  content: z.string()
    .min(1)
    .max(10000)
    .refine(val => !containsSqlInjection(val))
    .refine(val => !containsXss(val)),
  type: z.enum(['text', 'file', 'image']),
  conversationId: z.string().uuid()
});
```
- [ ] Schema validation for all endpoints
- [ ] SQL injection detection
- [ ] XSS prevention
- [ ] Path traversal prevention
- [ ] Request size limits
- [ ] Content-type validation

#### 4.2 DDoS Mitigation
- [ ] Connection limits per IP
- [ ] Request rate limits
- [ ] Slowloris protection
- [ ] Large request rejection
- [ ] Integration with CDN/WAF

#### 4.3 Bot Detection
- [ ] User-agent analysis
- [ ] Behavioral analysis
- [ ] CAPTCHA integration
- [ ] Bot score calculation
- [ ] Automated blocking

### 5. TLS/SSL Security

#### 5.1 Certificate Management
- [ ] Let's Encrypt automation
- [ ] Certificate monitoring
- [ ] Expiry alerts
- [ ] Auto-renewal
- [ ] Certificate pinning options

#### 5.2 TLS Configuration
```nginx
# Recommended TLS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_stapling on;
ssl_stapling_verify on;
```
- [ ] TLS 1.2/1.3 only
- [ ] Strong cipher suites
- [ ] HSTS configuration
- [ ] OCSP stapling
- [ ] Session resumption

### 6. Security Headers

#### 6.1 Response Headers
```typescript
// Security headers middleware
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};
```
- [ ] HSTS header
- [ ] CSP header
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Referrer-Policy

### 7. Audit Logging

#### 7.1 Security Event Logging
```typescript
// Security audit log
interface SecurityAuditLog {
  timestamp: Date;
  event_type: 'auth_success' | 'auth_failure' | 'permission_denied' | 'rate_limited';
  tenant_id: string;
  user_id?: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  method: string;
  status_code: number;
  details: Record<string, any>;
}
```
- [ ] Authentication events
- [ ] Authorization failures
- [ ] Rate limit events
- [ ] Blocked requests
- [ ] Suspicious activity

---

## Security Checklist

- [ ] All endpoints require authentication
- [ ] All endpoints validate authorization
- [ ] Input validation on all user input
- [ ] Rate limiting enabled
- [ ] TLS 1.2+ enforced
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] IP filtering available
- [ ] DDoS protection active
