# Phase 4.5.z.x - Flow Diagrams

## Visual Guide to Authentication Flows

---

## 1. Client Registration Flow (Future - Client-Facing UI)

```
┌──────────────┐
│  SAAS Client │
│  (Dashboard) │
└──────┬───────┘
       │
       │ 1. POST /v1/client/register
       │    { company_name, email, password, plan }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 2. Forward to auth service
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Validate   │
│ • Hash pwd   │
│ • Gen UUID   │
│ • Gen API    │
│   keys       │
│ • Store in   │
│   MongoDB    │
└──────┬───────┘
       │
       │ 3. Return credentials
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 4. Return to client
       │    { client_id, tenant_id, api_key }
       ▼
┌──────────────┐
│  SAAS Client │
│  (Dashboard) │
└──────────────┘
```

**Key Points**:
- Client registers via dashboard (future)
- Auth service generates API keys
- Keys returned only once (plaintext)
- Stored as hash in database

---

## 2. SDK Session Creation Flow (SAAS Backend → CAAS)

```
┌──────────────┐
│ SAAS Backend │
│  (Server)    │
└──────┬───────┘
       │
       │ 1. POST /v1/sdk/session
       │    Headers: X-API-Key: caas_prod_xxx
       │    Body: { user_external_id, user_data }
       ▼
┌──────────────┐
│   Gateway    │
│              │
│ • Extract    │
│   API key    │
│ • Extract    │
│   client IP  │
└──────┬───────┘
       │
       │ 2. POST /api/v1/auth/internal/validate-api-key
       │    { api_key, ip_address }
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Hash key   │
│ • Lookup DB  │
│ • Check IP   │
│   whitelist  │
│ • Return     │
│   context    │
└──────┬───────┘
       │
       │ 3. { valid: true, client: {...} }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 4. POST /api/v1/auth/sdk/session
       │    Headers: X-API-Key: caas_prod_xxx
       │    Body: { user_external_id, user_data }
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Find/create│
│   user       │
│ • Generate   │
│   JWT token  │
│ • Generate   │
│   refresh    │
│ • Store      │
│   session    │
└──────┬───────┘
       │
       │ 5. { access_token, refresh_token, socket_urls }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 6. Return to SAAS backend
       ▼
┌──────────────┐
│ SAAS Backend │
│              │
│ • Store      │
│   tokens     │
│ • Return to  │
│   end-user   │
└──────────────┘
```

**Key Points**:
- SAAS backend uses API key
- Gateway validates API key + IP
- Auth service creates session
- JWT token returned to SAAS
- SAAS passes token to end-user

---

## 3. End-User Request Flow (Browser/Mobile → CAAS)

```
┌──────────────┐
│  End User    │
│ (Browser)    │
└──────┬───────┘
       │
       │ 1. GET /v1/conversations
       │    Headers:
       │      Authorization: Bearer <jwt>
       │      Origin: https://app.example.com
       ▼
┌──────────────┐
│   Gateway    │
│              │
│ • Extract    │
│   JWT token  │
│ • Extract    │
│   Origin     │
└──────┬───────┘
       │
       │ 2. POST /api/v1/auth/internal/validate
       │    { token }
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Verify JWT │
│ • Check      │
│   expiry     │
│ • Check      │
│   blacklist  │
│ • Return     │
│   payload    │
└──────┬───────┘
       │
       │ 3. { valid: true, payload: {...} }
       ▼
┌──────────────┐
│   Gateway    │
│              │
│ • Check      │
│   origin     │
│   whitelist  │
│ • Add        │
│   context    │
│   headers    │
└──────┬───────┘
       │
       │ 4. GET /conversations
       │    Headers:
       │      X-Internal-Request: true
       │      X-Service-Token: <secret>
       │      X-User-Id: <uuid>
       │      X-Tenant-Id: <uuid>
       │      X-Request-Id: <uuid>
       ▼
┌──────────────┐
│  Messaging   │
│   Service    │
│              │
│ • Trust      │
│   context    │
│ • No token   │
│   validation │
│ • Query DB   │
└──────┬───────┘
       │
       │ 5. { conversations: [...] }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 6. Return to end-user
       ▼
┌──────────────┐
│  End User    │
│ (Browser)    │
└──────────────┘
```

**Key Points**:
- End-user uses JWT token
- Gateway validates token + origin
- Gateway passes context to services
- Services trust context (no re-validation)
- Fast and efficient

---

## 4. Socket Connection Flow (End-User → Socket Service)

```
┌──────────────┐
│  End User    │
│ (Browser)    │
└──────┬───────┘
       │
       │ 1. Connect WebSocket
       │    ws://socket-service:3001
       │    Auth: { token: <jwt> }
       ▼
┌──────────────┐
│Socket Service│
│              │
│ • Extract    │
│   token from │
│   handshake  │
└──────┬───────┘
       │
       │ 2. POST /api/v1/auth/internal/validate
       │    { token }
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Verify JWT │
│ • Return     │
│   payload    │
└──────┬───────┘
       │
       │ 3. { valid: true, payload: {...} }
       ▼
┌──────────────┐
│Socket Service│
│              │
│ • Store      │
│   context in │
│   socket.data│
│ • Store in   │
│   Redis      │
│ • Join rooms │
└──────┬───────┘
       │
       │ 4. Store in Redis
       │    Key: socket:{socket_id}
       │    Value: { user_id, tenant_id, ... }
       ▼
┌──────────────┐
│    Redis     │
└──────────────┘
       │
       │ 5. Emit 'authenticated' event
       ▼
┌──────────────┐
│  End User    │
│ (Browser)    │
│              │
│ Connected!   │
└──────────────┘

       │
       │ 6. User sends message
       │    { type: 'message', content: 'Hello' }
       ▼
┌──────────────┐
│Socket Service│
│              │
│ • Get context│
│   from       │
│   socket.data│
│ • OR get from│
│   Redis      │
│ • No token   │
│   validation!│
│ • Process    │
│   message    │
└──────────────┘
```

**Key Points**:
- Token validated once on connect
- Context stored in Redis
- No re-validation on messages
- Fast message processing
- Context used for permissions

---

## 5. Inter-Service Communication Flow

```
┌──────────────┐
│  End User    │
└──────┬───────┘
       │
       │ 1. POST /v1/media/upload
       │    Authorization: Bearer <jwt>
       ▼
┌──────────────┐
│   Gateway    │
│              │
│ • Validate   │
│   token via  │
│   auth svc   │
│ • Extract    │
│   context    │
└──────┬───────┘
       │
       │ 2. POST /upload
       │    Headers:
       │      X-Internal-Request: true
       │      X-Service-Token: <secret>
       │      X-User-Id: <uuid>
       │      X-Tenant-Id: <uuid>
       │      X-Request-Id: <uuid>
       ▼
┌──────────────┐
│Media Service │
│              │
│ • Check      │
│   X-Internal │
│ • Validate   │
│   service    │
│   token      │
│ • Extract    │
│   context    │
│ • Trust it!  │
└──────┬───────┘
       │
       │ 3. POST /store
       │    Headers: (same context headers)
       ▼
┌──────────────┐
│Storage Svc   │
│              │
│ • Trust      │
│   context    │
│ • Store file │
└──────┬───────┘
       │
       │ 4. { file_id, url }
       ▼
┌──────────────┐
│Media Service │
└──────┬───────┘
       │
       │ 5. { file_id, url }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 6. Return to user
       ▼
┌──────────────┐
│  End User    │
└──────────────┘
```

**Key Points**:
- Gateway validates once
- Context passed via headers
- Services trust context
- Service token validates internal requests
- No redundant validation
- Fast and efficient

---

## 6. Token Refresh Flow

```
┌──────────────┐
│  End User    │
│ (Browser)    │
└──────┬───────┘
       │
       │ 1. Access token expired
       │    (detected by 401 response)
       │
       │ 2. POST /v1/sdk/refresh
       │    Body: { refresh_token }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 3. POST /api/v1/auth/refresh
       │    Body: { refresh_token }
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Validate   │
│   refresh    │
│   token      │
│ • Check not  │
│   blacklisted│
│ • Generate   │
│   new access │
│ • Rotate     │
│   refresh    │
│ • Blacklist  │
│   old refresh│
└──────┬───────┘
       │
       │ 4. { access_token, refresh_token }
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 5. Return new tokens
       ▼
┌──────────────┐
│  End User    │
│ (Browser)    │
│              │
│ • Store new  │
│   tokens     │
│ • Retry      │
│   original   │
│   request    │
└──────────────┘
```

**Key Points**:
- Refresh token used to get new access token
- Old refresh token blacklisted
- New refresh token issued (rotation)
- Seamless for end-user

---

## 7. API Key Rotation Flow

```
┌──────────────┐
│ SAAS Client  │
│ (Dashboard)  │
└──────┬───────┘
       │
       │ 1. POST /v1/client/api-keys/rotate
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 2. POST /api/v1/auth/client/api-keys/rotate
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Generate   │
│   new key    │
│ • Store as   │
│   secondary  │
│ • Keep       │
│   primary    │
│   active     │
└──────┬───────┘
       │
       │ 3. { secondary_key: 'caas_prod_xxx' }
       ▼
┌──────────────┐
│ SAAS Client  │
│              │
│ • Update app │
│   to use new │
│   key        │
│ • Test       │
└──────┬───────┘
       │
       │ 4. POST /v1/client/api-keys/promote
       ▼
┌──────────────┐
│   Gateway    │
└──────┬───────┘
       │
       │ 5. POST /api/v1/auth/client/api-keys/promote
       ▼
┌──────────────┐
│ Auth Service │
│              │
│ • Promote    │
│   secondary  │
│   to primary │
│ • Revoke old │
│   primary    │
└──────┬───────┘
       │
       │ 6. { message: 'Key promoted' }
       ▼
┌──────────────┐
│ SAAS Client  │
│              │
│ Rotation     │
│ complete!    │
└──────────────┘
```

**Key Points**:
- Zero-downtime key rotation
- Both keys valid during transition
- Client updates to new key
- Old key revoked after promotion

---

## 8. Request Tracing Flow

```
┌──────────────┐
│  End User    │
└──────┬───────┘
       │
       │ 1. Request
       ▼
┌──────────────┐
│   Gateway    │
│              │
│ Generate:    │
│ X-Request-Id │
│ = uuid-1234  │
└──────┬───────┘
       │
       │ 2. Forward with X-Request-Id: uuid-1234
       ▼
┌──────────────┐
│Media Service │
│              │
│ Log:         │
│ request_id:  │
│ uuid-1234    │
└──────┬───────┘
       │
       │ 3. Forward with X-Request-Id: uuid-1234
       ▼
┌──────────────┐
│Storage Svc   │
│              │
│ Log:         │
│ request_id:  │
│ uuid-1234    │
└──────────────┘

All logs have same request_id → Easy to trace!
```

**Key Points**:
- Request ID generated at gateway
- Propagated to all services
- All logs include request ID
- Easy to trace request path
- Great for debugging

---

## Summary

These flows show how the new architecture:
1. **Centralizes** authentication in auth service
2. **Optimizes** performance with single validation
3. **Enhances** security with IP/origin validation
4. **Simplifies** inter-service communication
5. **Improves** debugging with request tracing

All flows are designed to be:
- **Fast**: Minimal validation overhead
- **Secure**: Proper authentication and authorization
- **Scalable**: Ready for horizontal scaling
- **Maintainable**: Clear and simple logic

---

**Status**: Architecture Defined
**Next**: Implementation
