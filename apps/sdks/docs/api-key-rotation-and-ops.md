# CaaS SDK — API Key Rotation & Operational Guide

## API Key Security Model

### Purpose & Scope

API keys authenticate **server-to-server** SDK calls to the CaaS gateway. Each key is scoped to:
- A **tenant** (organization).
- Optionally a **project** within that tenant.

### Key Rotation Procedure

#### Step 1: Generate New Key
Via admin portal or management API:
```
POST /api/v1/admin/api-keys
{ "tenant_id": "...", "project_id": "...", "label": "v2-rotation-2026-Q1" }
```

#### Step 2: Dual-Key Window
Deploy the **new key** to your application servers while keeping the **old key** active.
Both keys are valid during the rotation window. Validate the new key works:
```
curl -H "x-api-key: NEW_KEY" http://gateway:3000/api/v1/sdk/health
```

#### Step 3: Revoke Old Key
Once all instances use the new key:
```
DELETE /api/v1/admin/api-keys/{old_key_id}
```

#### Recommended Rotation Frequency
- **Production**: Every 90 days.
- **After incident**: Immediately.
- **Employee departure**: If any team member with key access leaves.

### Incident Handling

If a key is compromised:
1. **Immediately** generate a new key.
2. Deploy the new key to all services.
3. Revoke the compromised key.
4. Audit access logs for unauthorized usage during exposure window.

## Error Recovery Playbook

### Circuit Breaker Opens
**Symptom**: All requests fail immediately with `CIRCUIT_OPEN`.
**Action**: The gateway is likely unhealthy. Check gateway logs. The circuit resets automatically after the configured timeout (default 30s). If persistent, check infrastructure.

### Sustained 429 (Rate Limiting)
**Symptom**: `THROTTLE_ERROR` with increasing backoff.
**Action**: Reduce request volume. Check if you're exceeding plan limits. Consider request batching.

### Auth Errors (401/403)
**Symptom**: `AUTH_ERROR` on all requests.
**Action**: Verify API key is valid and not revoked. Check key scope matches project. Ensure key hasn't expired.

## Migration Notes — Future `project_id` Requirement

### Current Behavior (v0.x)
`project_id` is **optional** in SDK constructors and session creation. If omitted, the gateway infers it from the API key's default project scope.

### Planned Change (v1.0)
`project_id` will become **required** for all session operations. This ensures explicit tenant/project isolation.

### Migration Steps
1. Start passing `project_id` in all `createSession` / `create_session` calls **now**.
2. Set `projectId` in SDK constructor options as a fallback.
3. When v1.0 releases, you'll already be compliant.
4. SDKs will emit deprecation warnings before the breaking change (30-day notice window).
