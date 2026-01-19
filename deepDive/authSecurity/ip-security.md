# Auth Security - IP Security

> **Parent Roadmap**: [Auth & Security](../../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview

IP whitelisting and geo-blocking implementation for tenant security.

---

## 1. IP Whitelist Configuration

```typescript
interface IPSecurityConfig {
  tenantId: string;
  enabled: boolean;
  
  whitelist: {
    ips: string[];           // Individual IPs
    cidrs: string[];         // CIDR ranges
    description?: string;
  };
  
  blacklist: {
    ips: string[];
    cidrs: string[];
    reason?: string;
  };
  
  geoBlocking: {
    enabled: boolean;
    mode: 'allow' | 'deny';
    countries: string[];     // ISO country codes
  };
  
  bypassTokens: string[];    // Emergency bypass
}
```

---

## 2. IP Validation Middleware

```typescript
import { isInSubnet } from 'is-in-subnet';

async function validateIP(req: Request, res: Response, next: NextFunction) {
  const clientIP = getClientIP(req);
  const tenantId = req.tenantId;
  
  // Get security config
  const config = await getIPSecurityConfig(tenantId);
  
  if (!config.enabled) {
    return next();
  }
  
  // Check bypass token
  const bypassToken = req.headers['x-ip-bypass'];
  if (bypassToken && config.bypassTokens.includes(bypassToken)) {
    return next();
  }
  
  // Check blacklist first (always deny)
  if (isBlacklisted(clientIP, config.blacklist)) {
    return res.status(403).json({
      error: 'IP_BLOCKED',
      message: 'Your IP address is blocked'
    });
  }
  
  // Check whitelist
  if (config.whitelist.ips.length > 0 || config.whitelist.cidrs.length > 0) {
    if (!isWhitelisted(clientIP, config.whitelist)) {
      return res.status(403).json({
        error: 'IP_NOT_WHITELISTED',
        message: 'Your IP address is not in the allowed list'
      });
    }
  }
  
  // Check geo-blocking
  if (config.geoBlocking.enabled) {
    const country = await geoIP.lookup(clientIP);
    const inList = config.geoBlocking.countries.includes(country);
    
    if (config.geoBlocking.mode === 'allow' && !inList) {
      return res.status(403).json({
        error: 'GEO_BLOCKED',
        message: 'Access from your region is not allowed'
      });
    }
    
    if (config.geoBlocking.mode === 'deny' && inList) {
      return res.status(403).json({
        error: 'GEO_BLOCKED',
        message: 'Access from your region is blocked'
      });
    }
  }
  
  next();
}

function isWhitelisted(ip: string, whitelist: Whitelist): boolean {
  // Check direct IP match
  if (whitelist.ips.includes(ip)) return true;
  
  // Check CIDR ranges
  for (const cidr of whitelist.cidrs) {
    if (isInSubnet(ip, cidr)) return true;
  }
  
  return false;
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
