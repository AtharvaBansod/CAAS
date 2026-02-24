# Phase 4.5.z.x - Gateway & Auth Service Refactor

## Overview

This phase refactors the authentication architecture to establish the auth service as the single source of truth for all authentication and authorization. The gateway becomes a smart proxy that validates requests via the auth service and routes them appropriately.

## Problem Statement

The current architecture has several issues:
- Token generation scattered across services (gateway, auth service)
- Public key verification in multiple services
- Inconsistent authentication flows
- No clear separation between client onboarding, SDK auth, and end-user auth
- Redundant token validation in every service
- Confusion about public/private key usage

## Solution

Centralize all authentication in the auth service and optimize inter-service communication:

1. **Auth Service as Single Source of Truth**
   - All token generation happens here
   - All token validation goes through here
   - Manages API keys, sessions, and user authentication

2. **Gateway as Smart Proxy**
   - Validates requests via auth service
   - Enforces IP whitelist (server-to-server)
   - Enforces origin validation (client-side)
   - Routes to appropriate services
   - Never generates tokens

3. **Optimized Inter-Service Communication**
   - Gateway validates once
   - Passes context via headers
   - Downstream services trust context
   - No redundant validation

4. **Remove Public Key Infrastructure**
   - Delete keys/ folder
   - Remove public key verification
   - Use auth service for all validation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW AUTHENTICATION FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. CLIENT ONBOARDING (Future - Client-Facing UI)
   Client UI → Gateway → Auth Service
   - Register SAAS client
   - Generate API keys
   - Configure tenant settings

2. SDK AUTHENTICATION (SAAS Backend → CAAS)
   SAAS Backend → Gateway → Auth Service
   - Validate API key + IP whitelist
   - Create end-user session
   - Return JWT token

3. END-USER REQUESTS (Browser/Mobile → CAAS)
   End User → Gateway → Auth Service → Services
   - Validate JWT + origin
   - Pass context to services
   - Services trust context

4. SOCKET CONNECTION (End-User → Socket Service)
   End User → Socket Service → Auth Service
   - Validate token once on connect
   - Store context in Redis
   - Use for permissions
```

## Tasks

### Task 01: Auth Service Internal API Enhancement
**Priority**: Critical | **Estimated**: 8 hours

Enhance auth service with internal APIs for centralized authentication:
- Internal token validation endpoint
- SAAS client registration
- API key generation and management
- SDK session creation endpoint
- IP and origin whitelist management

**Files**: `01-auth-service-internal-api.json`

### Task 02: Gateway Route Restructuring
**Priority**: Critical | **Estimated**: 12 hours

Restructure gateway to use auth service and organize routes properly:
- Remove token generation from gateway
- Integrate auth service client
- Restructure routes (client, SDK, user)
- Implement IP and origin validation
- Update all routes to use new auth

**Files**: `02-gateway-route-restructuring.json`

### Task 03: Socket Service Auth Integration
**Priority**: High | **Estimated**: 6 hours

Update socket service to use auth service:
- Remove public key verification
- Validate token once on connection
- Store context in Redis
- Use context for permissions
- No re-validation on messages

**Files**: `03-socket-service-auth-integration.json`

### Task 04: Remove Public Key Infrastructure
**Priority**: Medium | **Estimated**: 3 hours

Clean up public key infrastructure:
- Delete keys/ folder
- Remove public key env variables
- Remove public key verification code
- Update docker-compose
- Update documentation

**Files**: `04-remove-public-key-infrastructure.json`

### Task 05: Inter-Service Communication Optimization
**Priority**: Medium | **Estimated**: 4 hours

Optimize inter-service communication:
- Define context headers
- Implement service token auth
- Pass context from gateway
- Downstream services trust context
- Add request tracing

**Files**: `05-inter-service-communication.json`

### Task 06: Testing and Documentation
**Priority**: High | **Estimated**: 8 hours

Comprehensive testing and documentation:
- E2E tests for all flows
- Integration tests
- Performance tests
- API documentation
- Architecture documentation
- Migration guide
- Troubleshooting guide

**Files**: `06-testing-and-documentation.json`

## Implementation Order

1. **Phase 1**: Auth Service (Task 01)
   - Implement all auth service endpoints
   - Test independently
   - Deploy to development

2. **Phase 2**: Gateway Integration (Task 02)
   - Integrate auth service client
   - Restructure routes
   - Test with auth service
   - Deploy to development

3. **Phase 3**: Socket Integration (Task 03)
   - Update socket service
   - Test WebSocket connections
   - Deploy to development

4. **Phase 4**: Optimization (Task 05)
   - Implement inter-service optimization
   - Test performance improvements
   - Deploy to development

5. **Phase 5**: Cleanup (Task 04)
   - Remove public key infrastructure
   - Verify everything works
   - Deploy to development

6. **Phase 6**: Testing & Docs (Task 06)
   - Run all tests
   - Complete documentation
   - Prepare for production

## Migration Strategy

### Feature Flags

Use environment variables to control migration:

```bash
# Enable new auth flow
USE_AUTH_SERVICE=true

# Enable IP whitelist validation
IP_WHITELIST_ENABLED=true

# Enable origin validation
ORIGIN_VALIDATION_ENABLED=true

# Service token for inter-service calls
SERVICE_SECRET=<random-64-char-string>
```

### Rollback Plan

If issues occur:
1. Set `USE_AUTH_SERVICE=false`
2. Restore keys/ folder from backup
3. Restore public key env variables
4. Restart services
5. Investigate and fix issues
6. Try again

### Testing Checklist

Before deploying to production:
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance tests meet targets
- [ ] Load tests show improvement
- [ ] Security audit completed
- [ ] Documentation reviewed
- [ ] Migration guide tested
- [ ] Rollback plan tested

## Expected Benefits

### Performance
- **10-20ms** reduction in request latency
- **60-70%** reduction in auth service load
- **90%+** cache hit rate for token validation
- **0ms** token validation in downstream services

### Security
- Centralized authentication logic
- Consistent security policies
- Better audit trail
- Easier to maintain and update

### Maintainability
- Clear separation of concerns
- Single source of truth
- Easier to debug
- Better code organization

### Scalability
- Reduced auth service load
- Better caching strategy
- Optimized inter-service calls
- Ready for horizontal scaling

## Environment Variables

### New Variables

```bash
# Auth Service
AUTH_SERVICE_URL=http://auth-service:3007
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Gateway
AUTH_SERVICE_URL=http://auth-service:3007
SERVICE_SECRET=<random-64-char-string>
IP_WHITELIST_ENABLED=true
ORIGIN_VALIDATION_ENABLED=true

# Socket Service
AUTH_SERVICE_URL=http://auth-service:3007
SERVICE_SECRET=<random-64-char-string>
```

### Removed Variables

```bash
# No longer needed
PUBLIC_KEY
PRIVATE_KEY
PUBLIC_KEY_PATH
PRIVATE_KEY_PATH
JWT_PUBLIC_KEY
JWT_PRIVATE_KEY
```

## API Endpoints

### Auth Service (Internal)

```
POST   /api/v1/auth/internal/validate           # Validate token
POST   /api/v1/auth/internal/validate-api-key   # Validate API key
POST   /api/v1/auth/client/register             # Register client
POST   /api/v1/auth/sdk/session                 # Create session
POST   /api/v1/auth/refresh                     # Refresh token
POST   /api/v1/auth/logout                      # Logout
```

### Gateway (Public)

```
# Client Routes (Future)
POST   /v1/client/register                      # Register SAAS client
POST   /v1/client/login                         # Dashboard login
GET    /v1/client/profile                       # Client profile

# SDK Routes (SAAS Backend)
POST   /v1/sdk/session                          # Create end-user session
POST   /v1/sdk/refresh                          # Refresh token
POST   /v1/sdk/logout                           # Logout

# User Routes (End-Users)
GET    /v1/conversations                        # List conversations
POST   /v1/conversations                        # Create conversation
GET    /v1/messages                             # List messages
POST   /v1/messages                             # Send message
```

## Security Considerations

### API Key Authentication
- Used for server-to-server (SAAS backend → Gateway)
- Requires IP whitelist match
- API keys hashed with SHA-256
- Support key rotation (primary + secondary)

### JWT Authentication
- Used for client-to-server (End-user → Gateway/Socket)
- Requires origin validation
- 15-minute expiry for access tokens
- 7-day expiry for refresh tokens
- Tokens can be revoked

### Service Token
- Used for inter-service communication
- Shared secret across services
- Validates internal requests
- Should be rotated periodically

### IP Whitelist
- Applied to API key requests
- Supports CIDR notation
- Cached in Redis
- Can be disabled for development

### Origin Whitelist
- Applied to JWT requests
- Validates Origin header
- Prevents unauthorized domains
- Can be disabled for development

## Monitoring

### Metrics to Track

```
# Auth Service
auth_token_validations_total
auth_token_validation_duration_seconds
auth_session_creations_total
auth_api_key_validations_total
auth_cache_hit_rate

# Gateway
gateway_requests_total
gateway_auth_failures_total
gateway_ip_whitelist_rejections_total
gateway_origin_rejections_total

# Socket Service
socket_connections_total
socket_auth_failures_total
socket_context_cache_hits_total
```

### Logs to Monitor

```
# Auth Service
- Token validation failures
- API key validation failures
- Session creation errors
- Database errors

# Gateway
- IP whitelist rejections
- Origin validation failures
- Auth service unavailable
- Rate limit exceeded

# Socket Service
- Connection rejections
- Token validation failures
- Context cache misses
```

## Troubleshooting

See `docs/TROUBLESHOOTING_AUTH.md` for detailed troubleshooting guide.

### Quick Checks

1. **Auth service not responding**
   ```bash
   curl http://auth-service:3007/health
   ```

2. **Token validation failing**
   ```bash
   # Check auth service logs
   docker logs auth-service | grep "validation"
   ```

3. **IP whitelist issues**
   ```bash
   # Check Redis cache
   redis-cli GET "ip:whitelist:{tenant_id}"
   ```

4. **Socket connection failing**
   ```bash
   # Check socket service logs
   docker logs socket-service | grep "auth"
   ```

## Documentation

- **Analysis**: `00-ANALYSIS-AND-PLAN.md`
- **Architecture**: `docs/architecture/authentication-architecture.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Migration Guide**: `docs/MIGRATION_GUIDE_AUTH_REFACTOR.md`
- **Troubleshooting**: `docs/TROUBLESHOOTING_AUTH.md`

## Success Criteria

- [ ] Auth service is single source of truth
- [ ] Gateway never generates tokens
- [ ] All services use auth service for validation
- [ ] Public keys removed from codebase
- [ ] IP whitelist enforced for API key requests
- [ ] Origin validation enforced for JWT requests
- [ ] Socket service validates once on connect
- [ ] Inter-service communication optimized
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Migration guide tested
- [ ] Production deployment successful

## Timeline

- **Week 1**: Tasks 01-02 (Auth service + Gateway)
- **Week 2**: Tasks 03-05 (Socket + Optimization + Cleanup)
- **Week 3**: Task 06 (Testing + Documentation)
- **Week 4**: Production deployment

## Team

- **Backend Lead**: Auth service implementation
- **Gateway Lead**: Gateway refactoring
- **Socket Lead**: Socket service integration
- **QA Lead**: Testing and validation
- **DevOps**: Deployment and monitoring
- **Tech Writer**: Documentation

## Status

**Current**: Planning Complete
**Next**: Begin Task 01 - Auth Service Enhancement

---

**Created**: 2026-02-24
**Phase**: 4.5.z.x
**Status**: Ready for Implementation
