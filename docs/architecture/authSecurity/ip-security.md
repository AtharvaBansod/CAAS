# Auth Security - IP Security

> **Parent Roadmap**: [Auth & Security](../../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview
 
IP whitelisting and geo-blocking implementation for tenant security.
 
> **CRITICAL NOTE**: IP Whitelisting is strictly for **Server-to-Server** communication (e.g., your backend calling CAAS APIs). End-users connecting from browsers/mobiles are authenticated via **JWT** and **Origin/Domain Whitelisting**, as their IPs are dynamic.
 
---

## 1. IP Whitelist Configuration

```typescript
interface IPSecurityConfig {
  tenantId: string;
  enabled: boolean;
  
  // Server-to-Server Security (Admin API)
  serverWhitelist: {
    ips: string[];           // Individual Backend IPs
    cidrs: string[];         // VPC/Subnet Ranges
  };
  
  // Client-Side Security (End-User Access)
  clientSecurity: {
    allowedOrigins: string[]; // Allowed Domains (e.g. app.client.com)
    geoBlocking: {
      enabled: boolean;
      mode: 'allow' | 'deny';
      countries: string[];
    };
  };

  blacklist: {
    ips: string[];
    reason?: string;
  };
}
```

---

## 2. Validation Middleware (Split)

### 2.1 Server-Side Validation (Strict IP Check)
```typescript
// Use this for Admin API routes (e.g. /api/admin/*)
async function validateServerIP(req: Request, res: Response, next: NextFunction) {
  const clientIP = getClientIP(req);
  const config = await getIPSecurityConfig(req.tenantId);
  
  if (!config.enabled) return next();

  // Strict Whitelist Check for Servers
  if (!isWhitelisted(clientIP, config.serverWhitelist)) {
    return res.status(403).json({ error: 'SERVER_IP_NOT_AUTHORIZED' });
  }

  next();
}
```

### 2.2 Client-Side Validation (Origin + Geo + Blacklist)
```typescript
// Use this for Client API/Socket routes (e.g. /api/chat/*)
async function validateClientAccess(req: Request, res: Response, next: NextFunction) {
  const clientIP = getClientIP(req);
  const origin = req.headers['origin'];
  const config = await getIPSecurityConfig(req.tenantId);

  // 1. Blacklist Check (Global)
  if (isBlacklisted(clientIP, config.blacklist)) {
    return res.status(403).json({ error: 'IP_BLOCKED' });
  }

  // 2. Origin (Domain) Whitelist
  if (config.clientSecurity.allowedOrigins.length > 0) {
    if (!origin || !config.clientSecurity.allowedOrigins.includes(origin)) {
       return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' });
    }
  }

  // 3. Geo Blocking (User Location)
  if (config.clientSecurity.geoBlocking.enabled) {
    const country = await geoIP.lookup(clientIP);
    // ... geo logic
  }

  next();
}

```

---

## 3. Client IP Extraction

```typescript
function getClientIP(req: Request): string {
  // Check standard headers (reverse proxy)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take first IP (client IP)
    const ips = (forwardedFor as string).split(',').map(ip => ip.trim());
    return ips[0];
  }
  
  // Check other common headers
  const realIP = req.headers['x-real-ip'];
  if (realIP) return realIP as string;
  
  // Cloudflare
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP) return cfIP as string;
  
  // Direct connection
  return req.socket.remoteAddress || '';
}
```

---

## 4. GeoIP Integration

```typescript
import maxmind, { CityResponse } from 'maxmind';

class GeoIPService {
  private db: maxmind.Reader<CityResponse>;
  
  async init(): Promise<void> {
    this.db = await maxmind.open('/data/GeoLite2-City.mmdb');
  }
  
  lookup(ip: string): GeoLocation | null {
    const result = this.db.get(ip);
    
    if (!result) return null;
    
    return {
      country: result.country?.iso_code,
      region: result.subdivisions?.[0]?.iso_code,
      city: result.city?.names?.en,
      latitude: result.location?.latitude,
      longitude: result.location?.longitude
    };
  }
}
```

---

## 5. Admin API

```typescript
// GET /api/tenants/:id/ip-security
router.get('/tenants/:id/ip-security', async (req, res) => {
  const config = await getIPSecurityConfig(req.params.id);
  res.json(config);
});

// PUT /api/tenants/:id/ip-security/whitelist
router.put('/tenants/:id/ip-security/whitelist', async (req, res) => {
  const { ips, cidrs } = req.body;
  
  // Validate IPs and CIDRs
  for (const ip of ips) {
    if (!isValidIP(ip)) {
      return res.status(400).json({ error: `Invalid IP: ${ip}` });
    }
  }
  
  for (const cidr of cidrs) {
    if (!isValidCIDR(cidr)) {
      return res.status(400).json({ error: `Invalid CIDR: ${cidr}` });
    }
  }
  
  await updateIPSecurityConfig(req.params.id, { whitelist: { ips, cidrs } });
  
  // Invalidate cache
  await invalidateIPSecurityCache(req.params.id);
  
  res.json({ success: true });
});
```

---

## 6. Audit Logging

```typescript
// Log all IP security events
async function logIPSecurityEvent(
  tenantId: string,
  clientIP: string,
  action: 'allowed' | 'blocked',
  reason: string
): Promise<void> {
  await auditLogger.log({
    tenantId,
    action: `ip_security.${action}`,
    resourceType: 'ip_address',
    resourceId: clientIP,
    metadata: { reason },
    ipAddress: clientIP,
    outcome: action === 'allowed' ? 'success' : 'failure'
  });
}
```

---

## Related Documents
- [Security Implementation](../publicGateway/security-implementation.md)
- [IP Whitelisting R&D](../../rnd/ip-whitelisting-security.md)
