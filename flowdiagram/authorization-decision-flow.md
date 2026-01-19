# Authorization Decision Flow

> Visual flow diagram for permission checking and access control decisions.

---

## Overview

How authorization decisions are made for each API request.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Incoming Request] --> B[Extract JWT/API Key]
    B --> C{Valid Token?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Extract User Context]
    
    E --> F[Get User Roles]
    F --> G[Get Resource Info]
    G --> H{RBAC Check}
    
    H -->|Denied| I{ABAC Check}
    H -->|Allowed| J[Access Granted]
    
    I -->|Denied| K[403 Forbidden]
    I -->|Allowed| J
    
    J --> L[Execute Request]
    L --> M[Audit Log]
    K --> M
    D --> M
```

---

## Decision Layers

### Layer 1: Authentication
- Token validation (JWT signature, expiry)
- API key verification
- Session validation

### Layer 2: RBAC (Role-Based)
```typescript
const rolePermissions = {
  admin: ['read', 'write', 'delete', 'manage'],
  member: ['read', 'write'],
  viewer: ['read'],
  guest: ['read:public']
};

function checkRBAC(userRole: string, action: string): boolean {
  return rolePermissions[userRole]?.includes(action) ?? false;
}
```

### Layer 3: ABAC (Attribute-Based)
```typescript
interface PolicyContext {
  subject: { userId, role, department };
  resource: { type, id, ownerId, tenantId };
  action: string;
  environment: { time, ip, location };
}

// Example policies
const policies = [
  {
    effect: 'allow',
    condition: (ctx) => ctx.resource.ownerId === ctx.subject.userId,
    actions: ['read', 'write', 'delete']
  },
  {
    effect: 'deny',
    condition: (ctx) => ctx.environment.time.getHours() < 9,
    actions: ['*'],
    description: 'No access before 9 AM'
  }
];
```

---

## Tenant Isolation Check

```mermaid
flowchart LR
    A[Request tenantId] --> B{Match Token tenantId?}
    B -->|No| C[403 Forbidden]
    B -->|Yes| D[Continue]
```

---

## Related Documents
- [Authentication Flow](./authentication-flow.md)
- [Auth & Security Roadmap](../roadmaps/3_AuthAutorizeSecurity.md)
