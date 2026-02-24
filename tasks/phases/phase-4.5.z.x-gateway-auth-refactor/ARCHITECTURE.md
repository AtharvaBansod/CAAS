# Phase 4.5.z.x - Gateway Auth Refactor: Architecture Overview

## Overview

This document describes the refactored authentication architecture for the CAAS platform. The key principle: **Auth Service is the single source of truth** for all authentication and authorization.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL CLIENTS                              │
│    ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│    │ Browser │    │ Mobile   │    │ SAAS     │    │ SDK      │      │
│    │ (JWT)   │    │ (JWT)    │    │ Backend  │    │ Client   │      │
│    └────┬────┘    └────┬─────┘    │(API Key) │    │(API Key) │      │
│         │              │          └────┬─────┘    └────┬─────┘      │
└─────────┼──────────────┼───────────────┼──────────────┼─────────────┘
          │              │               │              │
          ▼              ▼               ▼              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         GATEWAY SERVICE                              │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    AUTH MIDDLEWARE                            │    │
│  │  ┌─────────────┐  ┌───────────────┐  ┌─────────────────┐   │    │
│  │  │ JWT Strategy │  │ API Key       │  │ SDK Strategy    │   │    │
│  │  │ (delegates   │  │ Strategy      │  │ (delegates to   │   │    │
│  │  │  to auth svc)│  │ (delegates to │  │  auth svc)      │   │    │
│  │  └──────┬───────┘  │  auth svc)    │  └────────┬────────┘   │    │
│  │         │          └───────┬───────┘           │            │    │
│  └─────────┼──────────────────┼───────────────────┼────────────┘    │
│            │                  │                   │                  │
│  ┌─────────▼──────────────────▼───────────────────▼────────────┐    │
│  │              CONTEXT HEADERS MIDDLEWARE                       │    │
│  │   Attaches: X-User-Id, X-Tenant-Id, X-Session-Id,           │    │
│  │             X-Auth-Type, X-Client-Id, X-Service-Secret       │    │
│  └──────────────────────┬──────────────────────────────────────┘    │
│                          │                                           │
│  ┌──────────────────────▼──────────────────────────────────────┐    │
│  │                  ROUTE HANDLERS                               │    │
│  │  /api/v1/auth/*    → Proxy to Auth Service                   │    │
│  │  /api/v1/sdk/*     → Proxy to Auth Service (API key req)     │    │
│  │  /api/v1/client/*  → Proxy to Auth Service                   │    │
│  │  /api/v1/sessions  → Proxy to Auth Service                   │    │
│  │  Other routes      → Proxy to respective services            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   AUTH SERVICE   │ │ SOCKET SVC   │ │  OTHER SERVICES  │
│ (Single Source   │ │              │ │                  │
│  of Truth)       │ │  Validates   │ │  Trust context   │
│                  │ │  tokens via  │ │  headers from    │
│ • JWT signing    │ │  auth svc    │ │  gateway         │
│ • Token validate │ │  on connect  │ │                  │
│ • API key mgmt   │ │              │ │                  │
│ • Client mgmt    │ │  Stores ctx  │ │                  │
│ • SDK sessions   │ │  in Redis    │ │                  │
│ • IP whitelists  │ │              │ │                  │
└─────────────────┘ └──────────────┘ └──────────────────┘
```

## Authentication Flows

### 1. Browser/Mobile (JWT Authentication)

```
Client → Gateway → JWT Strategy → Auth Service /internal/validate
                                    ↓
                              Token valid?
                                    ↓
                             Yes: Auth context attached
                             No: 401 Unauthorized
```

### 2. SAAS Backend (API Key Authentication)

```
SAAS Backend → Gateway → API Key Strategy → Auth Service /internal/validate-api-key
                                              ↓
                                        Key valid? IP whitelisted?
                                              ↓
                                       Yes: Client context attached
                                       No: 401 Unauthorized
```

### 3. SDK Session Creation

```
SAAS Backend → Gateway → API Key Auth → Auth Service /sdk/session
                  ↓                          ↓
           Requires API key          Creates/finds user by external_id
           authentication            Generates JWT token pair
                                     Returns session + socket URLs
```

### 4. WebSocket Connection

```
Client → Socket Service → Auth Middleware → Auth Service /internal/validate
                              ↓                    ↓
                        Token valid?          Validates token
                              ↓
                        Store context in Redis
                        Join tenant rooms
                        Setup heartbeat
```

## Key Components

### Auth Service (Enhanced)

| Component | File | Purpose |
|-----------|------|---------|
| Internal Controller | `controllers/internal.controller.ts` | Token & API key validation endpoints |
| Client Controller | `controllers/client.controller.ts` | SAAS client management |
| SDK Controller | `controllers/sdk.controller.ts` | End-user session management |
| Client Repository | `repositories/client.repository.ts` | Client data with Redis caching |
| API Key Service | `services/api-key.service.ts` | Key generation, validation, rotation |
| IP Whitelist Service | `services/ip-whitelist.service.ts` | IP/CIDR validation |
| Token Service | `services/token.service.ts` | JWT signing with HS256 (no RSA) |

### Gateway (Refactored)

| Component | File | Purpose |
|-----------|------|---------|
| Auth Client | `clients/auth-client.ts` | HTTP client to Auth Service |
| JWT Strategy | `middleware/auth/jwt-auth.ts` | Delegates to Auth Service |
| API Key Strategy | `middleware/auth/api-key-auth.ts` | Delegates to Auth Service |
| SDK Strategy | `middleware/auth/sdk-auth.ts` | Delegates to Auth Service |
| Context Headers | `middleware/context-headers.middleware.ts` | Propagates auth context |
| Service Auth | `middleware/service-auth.middleware.ts` | Inter-service auth |
| SDK Routes | `routes/v1/sdk/index.ts` | SDK session management |
| Client Routes | `routes/v1/client/index.ts` | Client registration |

### Socket Service (Integrated)

| Component | File | Purpose |
|-----------|------|---------|
| Auth Client | `clients/auth-client.ts` | Validates tokens via Auth Service |
| Auth Middleware | `middleware/auth-middleware.ts` | Connection auth + Redis context |

## Security Model

### Token Signing
- **Algorithm**: HS256 (HMAC-SHA256)
- **Secret**: `JWT_SECRET` environment variable (shared by auth service only)
- **No RSA keys**: Auth service is the only entity that signs/verifies tokens

### API Key Security
- Keys are SHA-256 hashed before storage
- IP whitelist enforcement during validation
- Primary/secondary key rotation support
- Plan-based permissions and rate limiting

### Inter-Service Communication
- `X-Service-Secret` header validates requests from trusted services
- Context headers (`X-User-Id`, `X-Tenant-Id`, etc.) are trusted when service secret is valid
- In production, requests without service secret are rejected

## Environment Variables

### New Variables
| Variable | Service | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | Auth Service | HMAC signing secret |
| `SERVICE_SECRET` | All Services | Inter-service auth |
| `AUTH_SERVICE_URL` | Gateway, Socket | Auth Service endpoint |

### Removed Variables
| Variable | Replaced By |
|----------|-------------|
| `JWT_PRIVATE_KEY` | `JWT_SECRET` |
| `JWT_PUBLIC_KEY` | `JWT_SECRET` |
| `JWT_PRIVATE_KEY_PATH` | `JWT_SECRET` |
| `JWT_PUBLIC_KEY_PATH` | `JWT_SECRET` |
| `JWT_ALGORITHM` | Hardcoded HS256 |

## Migration Notes

1. **RSA keys are no longer needed** — Remove the `keys/` directory
2. **Set `JWT_SECRET`** — All token signing uses this single secret
3. **Set `SERVICE_SECRET`** — For inter-service communication
4. **Gateway no longer generates tokens** — All token operations go through Auth Service
5. **Socket service validates via HTTP** — No local JWT verification
