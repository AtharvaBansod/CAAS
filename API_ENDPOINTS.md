# CAAS Platform - API Endpoints

**Swagger UI:** http://localhost:3000/documentation  
**OpenAPI JSON:** http://localhost:3000/documentation/json

---

## Available API Endpoints

### Internal / Health Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/internal/health` | Internal health check |
| GET | `/internal/ready` | Readiness probe |
| GET | `/internal/health/detailed` | Detailed health status |
| GET | `/internal/metrics` | Internal metrics |
| GET | `/health` | Public health check |

### Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/sdk/token` | Generate SDK token |
| POST | `/v1/auth/logout` | Logout user |
| GET | `/v1/auth/api-keys` | List API keys |
| POST | `/v1/auth/api-keys` | Create API key |
| GET | `/v1/auth/api-keys/{id}` | Get API key details |
| PUT | `/v1/auth/api-keys/{id}` | Update API key |
| DELETE | `/v1/auth/api-keys/{id}` | Delete API key |

### Webhook Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/webhooks/` | List webhooks |
| POST | `/v1/webhooks/` | Create webhook |
| GET | `/v1/webhooks/{id}` | Get webhook details |
| PUT | `/v1/webhooks/{id}` | Update webhook |
| DELETE | `/v1/webhooks/{id}` | Delete webhook |
| GET | `/v1/webhooks/{id}/logs` | Get webhook logs |

### Tenant Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/tenant/` | Get tenant info |
| PUT | `/v1/tenant/` | Update tenant |
| GET | `/v1/tenant/settings` | Get tenant settings |
| PUT | `/v1/tenant/settings` | Update tenant settings |
| GET | `/v1/tenant/usage` | Get usage statistics |

### Utility Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/ping` | Ping endpoint |

---

## Authentication

Most endpoints require JWT Bearer token authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

### Security Schemes

- **bearerAuth**: HTTP Bearer authentication with JWT tokens

---

## How to Use Swagger UI

1. **Open Swagger UI:**  
   Navigate to http://localhost:3000/documentation in your browser

2. **Explore Endpoints:**  
   - Click on any endpoint to see details
   - View request/response schemas
   - See example payloads

3. **Authenticate:**  
   - Click "Authorize" button at the top
   - Enter your JWT token
   - Click "Authorize" to save

4. **Try It Out:**  
   - Click "Try it out" on any endpoint
   - Fill in required parameters
   - Click "Execute" to make the request
   - View the response

---

## Example API Calls

### Health Check
```bash
curl http://localhost:3000/health
```

### Get Tenant Info (Authenticated)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/v1/tenant/
```

### Create Webhook (Authenticated)
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com/webhook","events":["message.sent"]}' \
     http://localhost:3000/v1/webhooks/
```

---

## Disabled Endpoints (Phase 3+)

The following endpoint groups are currently disabled and will be enabled in future phases:

- `/v1/groups/*` - Group management (Phase 4)
- `/v1/keys/*` - Encryption key management (Phase 2 - to be enabled)
- `/v1/messages/*` - Messaging (Phase 4)
- `/v1/mfa/*` - Multi-factor authentication (Phase 2 - to be enabled)
- `/v1/sessions/*` - Session management (Phase 2 - to be enabled)
- `/v1/privacy/*` - Privacy/GDPR (Phase 2 - to be enabled)
- `/v1/verification/*` - Identity verification (Phase 2 - to be enabled)

---

## Response Formats

### Success Response
```json
{
  "status": "success",
  "data": { ... }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error message"
}
```

---

## Rate Limiting

- **Default Limit:** 100 requests per minute per IP
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## CORS

CORS is enabled for all origins in development mode. In production, configure allowed origins in environment variables.

---

## API Versioning

The API uses URL-based versioning:
- Current version: `v1`
- Base path: `/v1/*`

---

**Last Updated:** February 8, 2026  
**API Version:** 1.0.0  
**Status:** OPERATIONAL ✅
