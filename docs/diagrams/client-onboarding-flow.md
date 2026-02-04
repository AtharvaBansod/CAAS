# Client Onboarding Flow

> Visual flow diagram for SAAS client registration and onboarding process.

---

## Overview

Step-by-step flow from initial registration to first API call.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Start: Client Visits Portal] --> B[Registration Form]
    B --> C{Valid Business Email?}
    C -->|No| B
    C -->|Yes| D[Email Verification Sent]
    D --> E[Click Verification Link]
    E --> F[Create Password]
    F --> G[Onboarding Wizard]
    
    subgraph Onboarding["Onboarding Steps"]
        G --> H[Step 1: Company Profile]
        H --> I[Step 2: Create Application]
        I --> J[Step 3: Configure Domain/IPs]
        J --> K[Step 4: Select Features]
        K --> L[Step 5: Generate API Keys]
        L --> M[Step 6: Test Connection]
    end
    
    M --> N{Test Successful?}
    N -->|No| O[Debug Instructions]
    O --> M
    N -->|Yes| P[Dashboard Access Granted]
    P --> Q[End: Ready to Integrate]
```

---

## Step Details

### 1. Registration
- Company name, business email required
- Terms of Service acceptance
- Anti-bot verification (CAPTCHA)

### 2. Email Verification
- Verification link valid 24 hours
- Resend option available
- Security: One-time use token

### 3. Onboarding Wizard

| Step | Purpose | Data Collected |
|------|---------|----------------|
| Company Profile | Complete business details | Address, size, industry |
| Create Application | Register first app | App name, description |
| Configure Domain | Security setup | Domains, IP whitelist |
| Select Features | Enable capabilities | Chat, voice, video, etc. |
| Generate API Keys | Get credentials | API key + secret |
| Test Connection | Verify integration | SDK handshake test |

### 4. Test Connection
```typescript
// Test connection from client's server
const caas = new CaasClient({
  apiKey: 'generated-key',
  apiSecret: 'generated-secret'
});

const result = await caas.test.ping();
// Returns: { success: true, latency: 45 }
```

---

## Related Documents
- [Authentication Flow](./authentication-flow.md)
- [Client Facing UI Roadmap](../roadmaps/1_clientFacingUI.md)
