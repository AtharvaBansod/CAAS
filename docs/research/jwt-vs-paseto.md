# JWT vs PASETO Token Comparison

> Research comparing token formats for CAAS authentication.

---

## Overview

Evaluating JWT and PASETO for end-user authentication tokens.

---

## Comparison Table

| Feature | JWT | PASETO |
|---------|-----|--------|
| **Maturity** | Well established | Newer (2018) |
| **Library Support** | Excellent | Good, growing |
| **Algorithm Choice** | Many (risk of weak) | Limited, secure defaults |
| **Encryption** | Optional (JWE) | Built-in (local tokens) |
| **Footprint** | Bytes depend on algo | Slightly larger |
| **Key Management** | Flexible | Versioned |

---

## JWT Concerns

### Algorithm Confusion Attack
```typescript
// DANGER: Algorithm in header can be manipulated
const header = { alg: 'none' }; // Attacker changes HS256 to none

// Mitigation: Always verify algorithm explicitly
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### Common Vulnerabilities
1. `alg: none` attack
2. HS256/RS256 confusion
3. Key injection in header
4. Weak secret keys

---

## PASETO Advantages

### Version-Based Security
```
v1 = AES-256-CTR + HMAC-SHA384 (compatible)
v2 = XChaCha20-Poly1305 (modern, recommended)
v3 = Similar to v1, NIST compliance
v4 = Similar to v2, latest
```

### Token Types
```typescript
// Local token (encrypted, symmetric key)
// For server-to-server or storing sensitive data
v2.local.xxx

// Public token (signed, asymmetric keys)
// For client-facing tokens
v2.public.xxx
```

### No Algorithm in Token
```typescript
// PASETO: Algorithm determined by version prefix
// Cannot be changed by attacker
const token = 'v2.public.payload...';
```

---

## Recommendation for CAAS

**Decision: Use JWT (RS256) with strict validation**

### Reasons:
1. **Ecosystem support** - All frameworks support JWT
2. **Stripe/OAuth compatibility** - Industry standard
3. **Developer familiarity** - Lower learning curve
4. **Tooling** - jwt.io, debuggers widely available

### Required Mitigations:
```typescript
// Strict JWT verification
const verifyOptions = {
  algorithms: ['RS256'],          // Only allow RS256
  issuer: 'caas',                 // Verify issuer
  audience: 'caas-api',           // Verify audience
  clockTolerance: 30              // 30 second tolerance
};

// Key rotation
// Rotate signing keys every 90 days
// Support multiple valid keys during transition
```

---

## Token Structure (CAAS JWT)

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2024-01"
  },
  "payload": {
    "sub": "user-123",
    "iss": "caas",
    "aud": "caas-api",
    "iat": 1705123456,
    "exp": 1705127056,
    "tenant_id": "tenant-456",
    "permissions": ["chat", "voice"]
  }
}
```

---

## Related Documents
- [Auth & Security Roadmap](../roadmaps/3_AuthAutorizeSecurity.md)
- [Authentication Flow](../flowdiagram/authentication-flow.md)
