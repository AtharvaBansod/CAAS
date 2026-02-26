# Phase 6: Real Data Implementation Plan

## Overview
Remove all mock data from admin portal and connect to real backend services through the gateway.

## Current Mock Data Locations

### 1. Dashboard (`/dashboard`)
**Mock Data:**
- `stats`: active_users, messages_today, api_calls, active_connections (hardcoded numbers)
- `recent_activity`: 5 fake activity entries

**Real Data Source:**
- MongoDB: Count actual users, messages, API calls from collections
- Redis: Get active socket connections count
- Audit Service: Get recent audit log entries

### 2. API Keys Page (`/dashboard/api-keys`)
**Mock Data:**
- Array of 3 fake API keys with hardcoded IDs

**Real Data Source:**
- Auth Service: `/api/v1/auth/api-keys` (already implemented ✅)
- Operations: List, Create, Rotate, Promote, Revoke

### 3. Security Page (`/dashboard/security`)
**Mock Data:**
- IP whitelist: 3 fake IPs
- Origin whitelist: 2 fake origins

**Real Data Source:**
- Auth Service: `/api/v1/auth/ip-whitelist` and `/api/v1/auth/origin-whitelist` (already implemented ✅)
- Operations: Get, Add, Remove

### 4. Audit Logs Page (`/dashboard/audit-logs`)
**Mock Data:**
- 25 fake audit events

**Real Data Source:**
- Compliance Service: `/api/v1/audit/query` (already implemented ✅)
- Operations: Query with filters, Verify integrity

### 5. Team Page (`/dashboard/team`)
**Mock Data:**
- 3 fake team members

**Real Data Source:**
- **NOT IMPLEMENTED** - Need to create team management endpoints
- Required: List, Invite, Update Role, Remove

### 6. Monitoring Page (`/dashboard/monitoring`)
**Mock Data:**
- All metrics are hardcoded

**Real Data Source:**
- MongoDB: Query message counts, user activity
- Redis: Connection counts, cache stats
- Kafka: Topic metrics, consumer lag

## IP Whitelisting Explanation

### What is IP Whitelisting?
IP whitelisting is a security feature that restricts API access to only approved IP addresses. When enabled, the gateway will:

1. **Check incoming requests** against the whitelist
2. **Block requests** from non-whitelisted IPs
3. **Allow requests** only from approved IPs

### How It Works in Our System

```
┌─────────────────────────────────────────────────────────┐
│  Client Request from IP: 203.0.113.50                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Gateway: IP Whitelist Middleware                       │
│  1. Extract client IP from request                      │
│  2. Query Auth Service for client's whitelist           │
│  3. Check if IP matches any whitelisted entry           │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ✅ IP Match              ❌ No Match
   Allow Request            Block Request (403)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Forward to Backend Service                             │
└─────────────────────────────────────────────────────────┘
```

### Use Cases

1. **Corporate Networks**: Only allow API calls from company office IPs
2. **Server-to-Server**: Restrict SDK usage to known server IPs
3. **Development**: Whitelist developer IPs during testing
4. **Security**: Prevent unauthorized access even if API key is leaked

### Configuration

Tenants can manage their IP whitelist through:
- Admin Portal UI: `/dashboard/security`
- API Endpoints:
  - `GET /api/v1/auth/ip-whitelist?client_id=xxx` - List whitelisted IPs
  - `POST /api/v1/auth/ip-whitelist` - Add IP to whitelist
  - `DELETE /api/v1/auth/ip-whitelist/:ip?client_id=xxx` - Remove IP

### IP Format Support
- Single IP: `203.0.113.50`
- CIDR notation: `192.168.1.0/24` (entire subnet)
- IPv6: `2001:db8::1`

## Origin Whitelisting (CORS)

Similar to IP whitelisting but for browser-based requests:
- Restricts which domains can make API calls from browsers
- Prevents unauthorized websites from using your API keys
- Configured via: `/api/v1/auth/origin-whitelist`

## Implementation Tasks

### Task 1: Dashboard Real Data ✅ PRIORITY
**File**: `services/gateway/src/routes/v1/admin/dashboard.ts`

Replace mock data with:
```typescript
// Get tenant_id from auth context
const tenantId = request.user.tenant_id;

// Query MongoDB for real stats
const stats = {
  active_users: await countActiveUsers(tenantId),
  messages_today: await countMessagesToday(tenantId),
  api_calls: await countApiCallsToday(tenantId),
  active_connections: await getActiveConnections(tenantId),
};

// Query audit service for recent activity
const recent_activity = await getRecentAuditLogs(tenantId, 5);
```

### Task 2: API Keys Page Real Data ✅ ALREADY WORKING
**File**: `apps/admin-portal/src/app/dashboard/api-keys/page.tsx`

- Remove `mockKeys` array
- Use `useApiKeys()` hook (already exists)
- Connect to real API endpoints

### Task 3: Security Page Real Data ✅ ALREADY WORKING
**File**: `apps/admin-portal/src/app/dashboard/security/page.tsx`

- Remove `mockIps` and `mockOrigins`
- Use `useSecurity()` hook (already exists)
- Connect to real API endpoints

### Task 4: Audit Logs Real Data ✅ ALREADY WORKING
**File**: `apps/admin-portal/src/app/dashboard/audit-logs/page.tsx`

- Remove `mockEvents` array
- Use `useAudit()` hook (already exists)
- Connect to real API endpoints

### Task 5: Team Management Backend ❌ NOT IMPLEMENTED
**New Files Needed:**
- `services/auth-service/src/routes/team.ts`
- `services/gateway/src/routes/v1/team/index.ts`

**Endpoints to Create:**
- `GET /api/v1/team/members` - List team members
- `POST /api/v1/team/invite` - Invite new member
- `PUT /api/v1/team/members/:id/role` - Update member role
- `DELETE /api/v1/team/members/:id` - Remove member

### Task 6: Monitoring Page Real Data
**File**: `apps/admin-portal/src/app/dashboard/monitoring/page.tsx`

Create new endpoint: `GET /api/v1/admin/monitoring`
- Real-time metrics from Redis
- Message throughput from MongoDB
- System health from services

## Testing Strategy

### 1. Unit Tests
- Test each API endpoint with real database
- Verify data transformations
- Test error handling

### 2. Integration Tests
- Test full flow: UI → Gateway → Service → Database
- Verify authentication and authorization
- Test with multiple tenants (data isolation)

### 3. Docker-Based E2E Tests
```bash
# Test dashboard with real data
docker run --rm --network caas_caas-network \
  -e GATEWAY_URL=http://gateway:3000 \
  node:20-alpine node /tests/test-dashboard-real-data.js
```

## Success Criteria

✅ No hardcoded mock data in UI components
✅ All dashboard stats from real database queries
✅ API keys page shows actual keys from auth service
✅ Security page manages real IP/origin whitelists
✅ Audit logs page shows real compliance events
✅ All operations persist to database
✅ Multi-tenant data isolation verified
✅ All tests passing in Docker environment

## Timeline

1. **Dashboard Real Data** - 2 hours
2. **API Keys Integration** - 1 hour (mostly done)
3. **Security Integration** - 1 hour (mostly done)
4. **Audit Logs Integration** - 1 hour (mostly done)
5. **Team Management Backend** - 4 hours
6. **Team Management Frontend** - 2 hours
7. **Monitoring Real Data** - 2 hours
8. **Testing & Fixes** - 3 hours

**Total**: ~16 hours

## Next Steps

1. Start with Dashboard real data (highest visibility)
2. Connect existing pages to real APIs
3. Implement team management backend
4. Add monitoring real data
5. Comprehensive testing
6. Documentation updates
