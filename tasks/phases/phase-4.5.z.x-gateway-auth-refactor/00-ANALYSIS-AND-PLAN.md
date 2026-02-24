# Phase 4.5.z.x - Gateway & Auth Service Refactor

## Current Architecture Analysis

### Problems Identified

#### 1. **Inconsistent Authentication Flow**
- Gateway has its own JWT generation (`token-service.ts`)
- Auth service also generates JWTs independently
- Public key usage scattered across services for token verification
- No centralized auth validation - each service validates independently

#### 2. **Confused Responsibilities**
- Gateway acts as both proxy AND auth provider
- Token generation happens in multiple places
- No clear separation between:
  - Client onboarding (SAAS company registration)
  - SDK authentication (end-user tokens)
  - Inter-service communication

#### 3. **Public Key Confusion**
- `keys/` folder with public/private keys
- Services using public keys for JWT verification
- Should be using auth service for validation instead

#### 4. **Missing Client Onboarding Flow**
- No proper SAAS client registration endpoint
- No tenant configuration management
- No API key generation for SAAS clients
- Missing IP whitelist management

#### 5. **SDK Authentication Issues**
- Current `/auth/sdk/token` endpoint generates tokens in gateway
- Should delegate to auth service
- Missing proper app_id/app_secret validation
- No connection to tenant management

---

## Desired Architecture

### Authentication Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOWS                         │
└─────────────────────────────────────────────────────────────────────┘

1. SAAS CLIENT ONBOARDING (via Client-Facing UI - to be built)
   ┌──────────────┐      ┌──────────┐      ┌──────────────┐
   │ Client UI    │─────▶│ Gateway  │─────▶│ Auth Service │
   │ (Dashboard)  │      │          │      │              │
   └──────────────┘      └──────────┘      └──────────────┘
                              │                    │
                              ▼                    ▼
                         Register Client      Generate API Keys
                         Configure Tenant     Store in MongoDB
                         Set IP Whitelist     Return credentials

2. SDK INITIALIZATION (SAAS Backend → CAAS)
   ┌──────────────┐      ┌──────────┐      ┌──────────────┐
   │ SAAS Backend │─────▶│ Gateway  │─────▶│ Auth Service │
   │ (Server)     │      │          │      │              │
   └──────────────┘      └──────────┘      └──────────────┘
        │                     │                    │
        │ X-API-Key          │ Validate           │ Generate
        │ User Data          │ IP Whitelist       │ JWT Token
        │                     │                    │
        └─────────────────────┴────────────────────┘
                              │
                              ▼
                    Return JWT for end-user

3. END-USER REQUESTS (Browser/Mobile → CAAS)
   ┌──────────────┐      ┌──────────┐      ┌──────────────┐
   │ End User     │─────▶│ Gateway  │─────▶│ Auth Service │
   │ (Browser)    │      │          │      │ (Validate)   │
   └──────────────┘      └──────────┘      └──────────────┘
        │                     │                    │
        │ Bearer Token       │ Validate           │ Check Redis
        │ Origin Header      │ Origin             │ Return Context
        │                     │                    │
        └─────────────────────┴────────────────────┘
                              │
                              ▼
                    Forward to Socket/Services

4. SOCKET CONNECTION (End-User → Socket Service)
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │ End User     │─────▶│ Socket Svc   │─────▶│ Auth Service │
   │ (WebSocket)  │      │              │      │ (Validate)   │
   └──────────────┘      └──────────────┘      └──────────────┘
        │                     │                    │
        │ Bearer Token       │ Validate Once      │ Return Context
        │                     │ on Connect         │
        │                     │                    │
        └─────────────────────┴────────────────────┘
                              │
                              ▼
                    Store in Redis metadata
                    Use for room permissions
```

### Key Principles

1. **Auth Service is Single Source of Truth**
   - All token generation happens in auth service
   - All token validation goes through auth service
   - Gateway and other services NEVER generate tokens

2. **Gateway is Smart Proxy**
   - Validates requests via auth service
   - Enforces IP whitelist (server-to-server)
   - Enforces origin validation (client-side)
   - Routes to appropriate services
   - Does NOT generate tokens

3. **Two Authentication Modes**
   - **API Key Auth**: SAAS backend → Gateway (server-to-server)
     - Requires IP whitelist match
     - Used for creating end-user sessions
   - **JWT Auth**: End-user → Gateway/Socket (client-side)
     - Requires origin validation
     - Used for all end-user operations

4. **Inter-Service Communication**
   - Once gateway validates token, it's trusted
   - Services don't re-validate tokens
   - Context passed via headers
   - No public key verification needed

5. **Remove Public Key Usage**
   - Delete `keys/` folder
   - Remove public key verification from services
   - Auth service uses JWT secrets internally
   - Services call auth service for validation

---

## Implementation Plan

### Phase 1: Auth Service Enhancement
**Tasks 01-03**: Enhance auth service with proper endpoints

- Add SAAS client registration
- Add API key management
- Add SDK token generation endpoint
- Add internal validation endpoint (for gateway)

### Phase 2: Gateway Refactoring
**Tasks 04-06**: Refactor gateway to use auth service

- Remove token generation from gateway
- Implement auth service client
- Refactor authentication middleware
- Update all routes to use new flow

### Phase 3: Route Restructuring
**Tasks 07-09**: Organize routes properly

- Separate client-facing routes (dashboard - future)
- Separate SDK routes (SAAS backend)
- Separate end-user routes (authenticated users)
- Add proper guards and middleware

### Phase 4: Socket Service Integration
**Tasks 10-11**: Update socket service

- Remove public key verification
- Use auth service for connection validation
- Store validated context in Redis
- Use metadata for permissions

### Phase 5: Cleanup
**Tasks 12-14**: Remove old code

- Remove `keys/` folder
- Remove public key env variables
- Remove duplicate auth logic
- Update documentation

---

## API Endpoints Structure

### Auth Service (Internal)

```
POST   /api/v1/auth/client/register        # Register SAAS client
POST   /api/v1/auth/client/api-keys        # Generate API keys
POST   /api/v1/auth/sdk/session            # Create end-user session (via API key)
POST   /api/v1/auth/validate               # Validate token (internal)
POST   /api/v1/auth/refresh                # Refresh token
POST   /api/v1/auth/logout                 # Logout
GET    /api/v1/auth/session                # Get session info
```

### Gateway (Public)

```
# Client Onboarding (Future - Client-Facing UI)
POST   /v1/clients/register                # SAAS client registration
POST   /v1/clients/login                   # Dashboard login
GET    /v1/clients/profile                 # Client profile
PUT    /v1/clients/settings                # Update settings

# SDK Authentication (SAAS Backend)
POST   /v1/auth/sdk/session                # Create end-user session
POST   /v1/auth/sdk/refresh                # Refresh token
POST   /v1/auth/sdk/logout                 # Logout user

# End-User Operations (Authenticated)
GET    /v1/conversations                   # List conversations
POST   /v1/conversations                   # Create conversation
GET    /v1/messages                        # List messages
POST   /v1/messages                        # Send message
POST   /v1/media/upload                    # Upload file
GET    /v1/search                          # Search messages
```

### Socket Service

```
# WebSocket Connection
WS     /socket.io                          # Socket.IO connection
       - Validates token on connect
       - Stores context in Redis
       - Uses for room permissions
```

---

## Security Model

### Server-to-Server (API Key)
- SAAS backend calls gateway with `X-API-Key` header
- Gateway validates API key via auth service
- Gateway checks IP whitelist
- If valid, allows session creation

### Client-to-Server (JWT)
- End-user calls gateway with `Bearer` token
- Gateway validates token via auth service
- Gateway checks `Origin` header against whitelist
- If valid, forwards to services

### Socket Connection (JWT)
- End-user connects with `Bearer` token
- Socket service validates token via auth service (once)
- Stores validated context in Redis
- Uses metadata for room permissions
- No re-validation on every message

---

## Migration Strategy

1. **Parallel Implementation**
   - Keep old code working
   - Add new endpoints alongside
   - Test thoroughly

2. **Feature Flags**
   - Use env variable to switch between old/new
   - `USE_AUTH_SERVICE=true`

3. **Gradual Rollout**
   - Phase 1: Auth service ready
   - Phase 2: Gateway uses auth service
   - Phase 3: Socket service updated
   - Phase 4: Remove old code

4. **Testing**
   - Unit tests for each component
   - Integration tests for flows
   - E2E tests for complete scenarios

---

## Success Criteria

- [ ] Auth service is single source of truth for tokens
- [ ] Gateway never generates tokens
- [ ] All services use auth service for validation
- [ ] Public keys removed from codebase
- [ ] IP whitelist enforced for API key requests
- [ ] Origin validation enforced for JWT requests
- [ ] Socket service validates once on connect
- [ ] Inter-service communication is trusted
- [ ] All tests passing
- [ ] Documentation updated

---

## Next Steps

1. Review this analysis
2. Create detailed task JSON files
3. Implement Phase 1 (Auth Service)
4. Implement Phase 2 (Gateway)
5. Implement Phase 3 (Routes)
6. Implement Phase 4 (Socket)
7. Implement Phase 5 (Cleanup)
8. Test and validate
9. Update documentation
10. Deploy

---

**Status**: Planning Complete - Ready for Implementation
**Created**: 2026-02-24
**Phase**: 4.5.z.x
