# Flow Diagram: Request Processing Pipeline

> **Related Roadmaps**: 
> - [Public Gateway](../roadmaps/2_publicalllyExposedGateway.md)
> - [Auth & Security](../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview

Complete request lifecycle through the API Gateway, showing all middleware stages and decision points.

---

## 1. Full Request Pipeline

```mermaid
flowchart TD
    subgraph Entry["Entry Point"]
        A[Incoming Request] --> B[TLS Termination]
        B --> C[Request ID Generation]
    end

    subgraph Validation["Request Validation"]
        C --> D{Content-Type Valid?}
        D -->|No| E1[400 Bad Request]
        D -->|Yes| F{Request Size OK?}
        F -->|No| E2[413 Payload Too Large]
        F -->|Yes| G[Schema Validation]
        G --> H{Schema Valid?}
        H -->|No| E3[422 Validation Error]
        H -->|Yes| I[Sanitize Input]
    end

    subgraph Security["Security Layer"]
        I --> J{Rate Limited?}
        J -->|Yes| E4[429 Too Many Requests]
        J -->|No| K{IP Blocked?}
        K -->|Yes| E5[403 Forbidden]
        K -->|No| L[Extract Auth Token]
        L --> M{Token Present?}
        M -->|No| E6[401 Unauthorized]
        M -->|Yes| N[Validate Token]
        N --> O{Token Valid?}
        O -->|No| E7[401 Invalid Token]
        O -->|Yes| P[Check Permissions]
        P --> Q{Authorized?}
        Q -->|No| E8[403 Forbidden]
        Q -->|Yes| R[Tenant Isolation Check]
    end

    subgraph Routing["Request Routing"]
        R --> S[Determine Target Service]
        S --> T{Service Healthy?}
        T -->|No| U[Circuit Breaker Open?]
        U -->|Yes| E9[503 Service Unavailable]
        U -->|No| V[Retry with Backoff]
        T -->|Yes| W[Forward to Service]
    end

    subgraph Response["Response Handling"]
        W --> X[Receive Response]
        X --> Y[Response Transformation]
        Y --> Z[Add Response Headers]
        Z --> AA[Compress Response]
        AA --> AB[Return to Client]
    end

    E1 --> Log[Log & Metrics]
    E2 --> Log
    E3 --> Log
    E4 --> Log
    E5 --> Log
    E6 --> Log
    E7 --> Log
    E8 --> Log
    E9 --> Log
    AB --> Log

    style A fill:#87CEEB
    style AB fill:#90EE90
    style E1 fill:#FFB6C1
    style E2 fill:#FFB6C1
    style E3 fill:#FFB6C1
    style E4 fill:#FFB6C1
    style E5 fill:#FFB6C1
    style E6 fill:#FFB6C1
    style E7 fill:#FFB6C1
    style E8 fill:#FFB6C1
    style E9 fill:#FFB6C1
```

---

## 2. Middleware Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MIDDLEWARE EXECUTION ORDER                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Request ──┬──▶ [1. Request Logger]                                         │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [2. Request ID]                                              │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [3. CORS Handler]                                            │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [4. Body Parser]                                             │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [5. Rate Limiter] ───▶ 429 if exceeded                      │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [6. IP Filter] ───▶ 403 if blocked                          │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [7. Auth Validator] ───▶ 401 if invalid                     │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [8. Permission Check] ───▶ 403 if denied                    │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [9. Tenant Resolver]                                         │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [10. Request Validator]                                      │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [11. Route Handler] ◀─── Business Logic                     │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [12. Response Transformer]                                   │
│            │        │                                                        │
│            │        ▼                                                        │
│            │    [13. Response Logger]                                        │
│            │        │                                                        │
│            ◀────────┘                                                        │
│  Response                                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Decision Tree

```mermaid
flowchart TD
    Start[Extract Auth Header] --> A{Header Present?}
    A -->|No| B{API Key Header?}
    A -->|Yes| C{Bearer Token?}
    
    B -->|No| E1[401: No Credentials]
    B -->|Yes| D[Validate API Key]
    D --> D1{Key Valid?}
    D1 -->|No| E2[401: Invalid API Key]
    D1 -->|Yes| D2[Extract Tenant Context]
    D2 --> Success[Authenticated]
    
    C -->|No| E3[401: Invalid Auth Type]
    C -->|Yes| F[Decode JWT]
    F --> G{Decode Success?}
    G -->|No| E4[401: Malformed Token]
    G -->|Yes| H[Verify Signature]
    H --> I{Signature Valid?}
    I -->|No| E5[401: Invalid Signature]
    I -->|Yes| J{Token Expired?}
    J -->|Yes| E6[401: Token Expired]
    J -->|No| K[Check Revocation]
    K --> L{Revoked?}
    L -->|Yes| E7[401: Token Revoked]
    L -->|No| M[Extract User Context]
    M --> Success

    style Success fill:#90EE90
    style E1 fill:#FFB6C1
    style E2 fill:#FFB6C1
    style E3 fill:#FFB6C1
    style E4 fill:#FFB6C1
    style E5 fill:#FFB6C1
    style E6 fill:#FFB6C1
    style E7 fill:#FFB6C1
```

---

## 4. Rate Limiting Flow

```mermaid
flowchart TD
    subgraph RateCheck["Rate Limit Check"]
        A[Incoming Request] --> B[Extract Rate Limit Key]
        B --> C{Key Type}
        C -->|API Key| D[tenant:{tenantId}]
        C -->|JWT| E[user:{userId}]
        C -->|IP| F[ip:{ip}]
    end

    subgraph RedisCheck["Redis Lookup"]
        D --> G[Check Redis Counter]
        E --> G
        F --> G
        G --> H{Within Limit?}
    end

    subgraph Response["Rate Limit Response"]
        H -->|Yes| I[Increment Counter]
        I --> J[Set Headers]
        J --> K[Continue Pipeline]
        
        H -->|No| L[Check Burst Allowance]
        L --> M{Burst OK?}
        M -->|Yes| I
        M -->|No| N[Set Retry-After]
        N --> O[429 Response]
    end

    style K fill:#90EE90
    style O fill:#FFB6C1
```

---

## 5. Circuit Breaker States

```mermaid
stateDiagram-v2
    [*] --> Closed
    
    Closed --> Open: Failure threshold exceeded
    Closed --> Closed: Success / Failure below threshold
    
    Open --> HalfOpen: Timeout expired
    Open --> Open: Reject requests immediately
    
    HalfOpen --> Closed: Probe request succeeds
    HalfOpen --> Open: Probe request fails

    note right of Closed: Normal operation\nRequests pass through
    note right of Open: Failing fast\nReturn 503 immediately
    note right of HalfOpen: Testing recovery\nAllow one request
```

```
CIRCUIT BREAKER CONFIGURATION:

┌─────────────────────────────────────────────────────────┐
│                                                          │
│  Thresholds:                                            │
│  ├── Failure Rate Threshold: 50%                        │
│  ├── Minimum Requests:       10 (in window)            │
│  ├── Window Duration:        10 seconds                │
│  └── Open State Duration:    30 seconds                │
│                                                          │
│  Counted as Failures:                                   │
│  ├── HTTP 5xx responses                                 │
│  ├── Connection timeouts                                │
│  ├── Connection refused                                 │
│  └── Request timeouts                                   │
│                                                          │
│  NOT Counted as Failures:                               │
│  ├── HTTP 4xx responses (client errors)                │
│  └── Successful responses with business errors         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Service Routing

```mermaid
flowchart LR
    subgraph Gateway["API Gateway"]
        Router[Route Resolver]
    end

    subgraph Services["Backend Services"]
        Auth[Auth Service<br/>/auth/*]
        Messages[Message Service<br/>/messages/*]
        Users[User Service<br/>/users/*]
        Files[File Service<br/>/files/*]
        Analytics[Analytics Service<br/>/analytics/*]
    end

    Router -->|/auth/login| Auth
    Router -->|/auth/refresh| Auth
    Router -->|/messages/send| Messages
    Router -->|/messages/list| Messages
    Router -->|/users/profile| Users
    Router -->|/users/search| Users
    Router -->|/files/upload| Files
    Router -->|/analytics/*| Analytics

    style Router fill:#FFE4B5
```

---

## 7. Error Response Standardization

```
STANDARDIZED ERROR RESPONSE FORMAT:

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}

ERROR CODE MAPPING:

┌─────────────────────────────────────────────────────────────────────┐
│ HTTP Status │ Error Code           │ Description                   │
├─────────────┼──────────────────────┼───────────────────────────────┤
│ 400         │ BAD_REQUEST          │ Malformed request             │
│ 400         │ VALIDATION_ERROR     │ Schema validation failed      │
│ 401         │ UNAUTHORIZED         │ No credentials                │
│ 401         │ INVALID_TOKEN        │ Token validation failed       │
│ 401         │ TOKEN_EXPIRED        │ Token has expired             │
│ 403         │ FORBIDDEN            │ Permission denied             │
│ 403         │ IP_BLOCKED           │ IP not whitelisted            │
│ 404         │ NOT_FOUND            │ Resource not found            │
│ 409         │ CONFLICT             │ Resource conflict             │
│ 413         │ PAYLOAD_TOO_LARGE    │ Request body too large        │
│ 429         │ RATE_LIMITED         │ Too many requests             │
│ 500         │ INTERNAL_ERROR       │ Unexpected server error       │
│ 502         │ BAD_GATEWAY          │ Upstream service error        │
│ 503         │ SERVICE_UNAVAILABLE  │ Circuit breaker open          │
│ 504         │ GATEWAY_TIMEOUT      │ Upstream timeout              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Gateway Security Implementation](../deepDive/publicGateway/security-implementation.md)
- [Rate Limiting Strategies](../deepDive/publicGateway/rate-limiting.md)
- [Gateway Roadmap](../roadmaps/2_publicalllyExposedGateway.md)
