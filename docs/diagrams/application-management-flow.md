# Application Management Flow

> Visual flow for creating and managing applications.

---

## Flow Diagram

```mermaid
flowchart TD
    subgraph Create["Create Application"]
        A[Open Create Dialog] --> B[Enter App Name]
        B --> C[Configure Settings]
        C --> D[Set Allowed Domains]
        D --> E[Submit]
        E --> F[Generate App ID]
        F --> G[Create API Keys]
        G --> H[Initialize Resources]
        H --> I[Show Success + Keys]
    end
    
    subgraph Configure["Configure Application"]
        J[Select Application] --> K[View Dashboard]
        K --> L{Action?}
        L -->|Settings| M[Edit Settings]
        L -->|Domains| N[Manage Domains]
        L -->|Keys| O[Manage API Keys]
        L -->|Features| P[Enable Features]
    end
    
    subgraph Keys["API Key Management"]
        O --> Q[View Current Keys]
        Q --> R{Action?}
        R -->|Rotate| S[Generate New Key]
        R -->|Revoke| T[Revoke Key]
        S --> U[Update Client Apps]
    end
    
    subgraph Delete["Delete Application"]
        V[Request Delete] --> W[Confirm with Name]
        W --> X[Soft Delete]
        X --> Y[30-Day Grace Period]
        Y --> Z[Permanent Delete]
    end
```

---

## Application States

```typescript
type ApplicationStatus = 
  | 'active'       // Normal operation
  | 'suspended'    // Admin suspended
  | 'pending'      // Awaiting setup
  | 'deleted';     // Soft deleted

interface Application {
  id: string;
  tenantId: string;
  name: string;
  status: ApplicationStatus;
  
  settings: {
    allowedDomains: string[];
    ipWhitelist: string[];
    features: string[];
    webhookUrl?: string;
  };
  
  keys: {
    primary: { hash: string; createdAt: Date };
    secondary: { hash: string; createdAt: Date };
  };
  
  createdAt: Date;
  deletedAt?: Date;
}
```

---

## Domain Validation

```typescript
async function validateDomain(domain: string): Promise<boolean> {
  // Check DNS TXT record
  const records = await dns.resolveTxt(`_caas.${domain}`);
  
  const expectedValue = `caas-verify=${appId}`;
  return records.some(r => r.join('') === expectedValue);
}
```

---

## Related Documents
- [Client Onboarding Flow](./client-onboarding-flow.md)
- [Client Facing UI Roadmap](../roadmaps/1_clientFacingUI.md)
