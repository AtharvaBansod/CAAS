# Flow Diagram: Authentication Flow

> **Related Roadmaps**: 
> - [Client Facing UI](../roadmaps/1_clientFacingUI.md)
> - [Auth, Authorization & Security](../roadmaps/3_AuthAutorizeSecurity.md)
> - [API Gateway](../roadmaps/2_publicalllyExposedGateway.md)

---

## Overview

Complete authentication flows for both SAAS clients (dashboard access) and end users (chat access).

---

## 1. SAAS Client Registration Flow

```mermaid
flowchart TD
    subgraph Registration["Client Registration"]
        A[Visit Registration Page] --> B[Enter Company Details]
        B --> C[Enter Email & Password]
        C --> D{Valid Business Email?}
        D -->|No| E[Show Error:<br/>Use company email]
        D -->|Yes| F[Check Password Strength]
        F --> G{Strong Enough?}
        G -->|No| H[Show Requirements]
        G -->|Yes| I[Accept Terms & Privacy]
        I --> J[Submit Registration]
    end

    subgraph Verification["Email Verification"]
        J --> K[Create Pending Account]
        K --> L[Generate Verification Token]
        L --> M[Send Verification Email]
        M --> N[User Clicks Link]
        N --> O{Token Valid?}
        O -->|No| P[Show Expiry Error]
        O -->|Yes| Q[Activate Account]
        Q --> R[Redirect to Onboarding]
    end

    E --> B
    H --> F
    P --> S[Resend Email]
    S --> M

    style Q fill:#90EE90
    style E fill:#FFB6C1
    style P fill:#FFB6C1
```

---

## 2. SAAS Client Login Flow

```mermaid
flowchart TD
    subgraph Login["Login Process"]
        A[Visit Login Page] --> B[Enter Credentials]
        B --> C[Submit Login]
        C --> D{Rate Limited?}
        D -->|Yes| E[Show Cooldown Timer]
        D -->|No| F[Validate Credentials]
        F --> G{Valid?}
        G -->|No| H[Increment Failed Attempts]
        H --> I{Locked Out?}
        I -->|Yes| J[Show Lockout Message]
        I -->|No| K[Show Error]
        G -->|Yes| L{2FA Enabled?}
    end

    subgraph TwoFactor["Two-Factor Authentication"]
        L -->|Yes| M[Show 2FA Input]
        M --> N[Enter TOTP Code]
        N --> O{Code Valid?}
        O -->|No| P[Show Invalid Code]
        O -->|Yes| Q[Create Session]
        L -->|No| Q
    end

    subgraph Session["Session Creation"]
        Q --> R[Generate Access Token<br/>15 min expiry]
        R --> S[Generate Refresh Token<br/>7 day expiry]
        S --> T[Store Session in Redis]
        T --> U[Set HTTP-Only Cookies]
        U --> V[Redirect to Dashboard]
    end

    E --> A
    K --> B
    P --> M

    style V fill:#90EE90
    style J fill:#FFB6C1
```

---

## 3. End User Authentication Flow

```mermaid
sequenceDiagram
    participant SaaS as SAAS Application
    participant SDK as CAAS SDK
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Socket as Socket Service

    Note over SaaS,Socket: End User Chat Session Initialization

    SaaS->>SaaS: User logs in to SAAS app
    SaaS->>SaaS: Get user details (id, name, avatar)
    
    rect rgb(240, 248, 255)
        Note over SaaS,Auth: Step 1: Create CAAS Session
        SaaS->>Gateway: POST /auth/session<br/>Headers: X-API-Key: sk_xxx<br/>Body: { userId, userData }
        Gateway->>Gateway: Validate API Key
        Gateway->>Gateway: Check IP Whitelist
        Gateway->>Auth: Create user session
        Auth->>Auth: Generate JWT<br/>{sub, tenant_id, permissions}
        Auth-->>Gateway: { accessToken, refreshToken, expiresIn }
        Gateway-->>SaaS: Session created
    end

    rect rgb(255, 248, 240)
        Note over SaaS,Socket: Step 2: Initialize SDK
        SaaS->>SDK: caas.init({ token })
        SDK->>Gateway: Validate token
        Gateway->>Auth: Verify JWT
        Auth-->>Gateway: Token valid
        Gateway-->>SDK: User context
    end

    rect rgb(240, 255, 240)
        Note over SDK,Socket: Step 3: Socket Connection
        SDK->>Socket: Connect WebSocket<br/>Auth: Bearer token
        Socket->>Auth: Validate token
        Auth-->>Socket: User context
        Socket->>Socket: Join user rooms
        Socket-->>SDK: Connected
    end

    SDK->>SaaS: Ready for chat features
```

---

## 4. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Redis

    Note over Client,Redis: Access Token Refresh

    Client->>Gateway: API Request<br/>Authorization: Bearer {expired_token}
    Gateway->>Auth: Validate token
    Auth-->>Gateway: TokenExpiredError

    Gateway-->>Client: 401 Unauthorized

    Client->>Gateway: POST /auth/refresh<br/>Cookie: refresh_token
    Gateway->>Auth: Validate refresh token
    Auth->>Redis: Check token not blacklisted
    
    alt Token blacklisted
        Redis-->>Auth: Token revoked
        Auth-->>Gateway: InvalidRefreshToken
        Gateway-->>Client: 401 - Re-login required
    else Token valid
        Redis-->>Auth: Token valid
        Auth->>Auth: Generate new access token
        Auth->>Auth: Rotate refresh token
        Auth->>Redis: Blacklist old refresh token
        Auth-->>Gateway: { accessToken, refreshToken }
        Gateway-->>Client: 200 OK + new tokens
    end

    Client->>Client: Store new tokens
    Client->>Gateway: Retry original request
```

---

## 5. OAuth Integration Flow

```mermaid
flowchart LR
    subgraph Client["Client Portal"]
        A[Login Page] --> B[Click OAuth Button]
    end

    subgraph OAuth["OAuth Provider"]
        C[Authorization Page] --> D{User Consents?}
        D -->|No| E[Denied]
        D -->|Yes| F[Generate Auth Code]
    end

    subgraph CAAS["CAAS Backend"]
        G[Receive Callback] --> H[Exchange Code for Token]
        H --> I[Fetch User Info]
        I --> J{Existing Account?}
        J -->|Yes| K[Link Account]
        J -->|No| L[Create Account]
        K --> M[Create Session]
        L --> M
        M --> N[Redirect to Dashboard]
    end

    B --> C
    F --> G
    E --> A

    style N fill:#90EE90
    style E fill:#FFB6C1
```

---

## 6. Password Reset Flow

```mermaid
flowchart TD
    subgraph Request["Request Reset"]
        A[Click Forgot Password] --> B[Enter Email]
        B --> C[Submit Request]
        C --> D{Email Exists?}
        D -->|No| E[Show Generic Success<br/>Prevent enumeration]
        D -->|Yes| F[Generate Reset Token]
        F --> G[Store Token<br/>1 hour expiry]
        G --> H[Send Reset Email]
        H --> E
    end

    subgraph Reset["Reset Password"]
        I[Click Email Link] --> J{Token Valid?}
        J -->|No| K[Show Expired Error]
        J -->|Yes| L[Show Reset Form]
        L --> M[Enter New Password]
        M --> N{Meets Requirements?}
        N -->|No| O[Show Requirements]
        N -->|Yes| P[Hash & Save Password]
        P --> Q[Invalidate Reset Token]
        Q --> R[Invalidate All Sessions]
        R --> S[Redirect to Login]
    end

    E --> E2[Check Inbox]
    E2 --> I
    K --> T[Request New Link]
    T --> B
    O --> M

    style S fill:#90EE90
    style K fill:#FFB6C1
```

---

## 7. Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     SESSION LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐     │
│  │  CREATE  │──▶│  ACTIVE  │──▶│ EXPIRING │──▶│ EXPIRED  │     │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘     │
│       │              │              │              │             │
│       ▼              ▼              ▼              ▼             │
│  [Login/Register]  [Active Use]  [Near Timeout]  [Timed Out]   │
│                        │              │                          │
│                        │              ▼                          │
│                        │       ┌──────────┐                      │
│                        │       │ REFRESHED │                     │
│                        │       └───────────┘                     │
│                        │              │                          │
│                        ◀──────────────┘                          │
│                                                                  │
│  Special States:                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                     │
│  │ REVOKED  │   │ SUSPENDED│   │ FORCE    │                     │
│  │          │   │          │   │ LOGOUT   │                     │
│  └──────────┘   └──────────┘   └──────────┘                     │
│       ▲              ▲              ▲                            │
│       │              │              │                            │
│  [Admin Action]  [Security]   [User Action]                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

TOKEN TIMINGS:
┌─────────────────────────────────────────────────────────────────┐
│ Access Token:  [████████████████░░░░░░░░░]  15 minutes         │
│ Refresh Token: [██████████████████████████████████████] 7 days │
│ Session Max:   [██████████████████████████████████████] 30 days│
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Client UI Authentication Flow](../deepDive/clientFacingUI/authentication-flow.md)
- [Gateway Security Implementation](../deepDive/publicGateway/security-implementation.md)
- [API Key Security](../rnd/api-key-security.md)
