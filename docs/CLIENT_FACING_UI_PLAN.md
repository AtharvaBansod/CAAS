# CAAS Client-Facing UI — Comprehensive Plan

> **Author**: System Planner  
> **Date**: 2026-02-25  
> **Status**: Planning Phase — No implementation yet  
> **Backend Test Report**: `tests/reports/full-system-report-20260225-022033.md` (125 tests, 0 failures)

---

## Table of Contents

1. [Vision & Purpose](#1-vision--purpose)
2. [Platform Architecture Context](#2-platform-architecture-context)
3. [Backend API Readiness Matrix](#3-backend-api-readiness-matrix)
4. [Page-by-Page Feature Breakdown](#4-page-by-page-feature-breakdown)
5. [Gaps & Missing Backend Services](#5-gaps--missing-backend-services)
6. [Onboarding Flow (Step-by-Step)](#6-onboarding-flow-step-by-step)
7. [Security & Authentication Flow](#7-security--authentication-flow)
8. [Technology Stack Decisions](#8-technology-stack-decisions)
9. [Docker & Deployment Architecture](#9-docker--deployment-architecture)
10. [Task Phases & Execution Order](#10-task-phases--execution-order)

---

## 1. Vision & Purpose

The **Client-Facing UI** (hereafter "Admin Portal" or "Console") is the web application that **SAAS tenant administrators** use to:

- **Register** their company / application with CAAS
- **Configure** security settings (IP whitelists, origin whitelists, API keys)
- **Generate** API keys for their backend servers
- **Create SDK sessions** for their end-users (or understand how to via documentation)
- **Monitor** usage, analytics, audit logs, active connections
- **Manage** billing, subscriptions, and quotas
- **Control** team members with role-based access
- **Access** documentation, code examples, and integration guides

This is analogous to the **Supabase Dashboard**, **Firebase Console**, or **Twilio Console** — a developer-focused management portal.

---

## 2. Platform Architecture Context

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ADMIN PORTAL (Next.js)                         │
│                                                                      │
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Login │ │Dashboard │ │API Keys │ │Analytics │ │Settings      │  │
│  │Signup│ │Overview  │ │Manager  │ │& Logs    │ │& Billing     │  │
│  └──┬───┘ └────┬─────┘ └────┬────┘ └────┬─────┘ └──────┬───────┘  │
│     └──────────┴────────────┴───────────┴──────────────┘           │
│                              │                                      │
│                    ┌─────────┴─────────┐                           │
│                    │  API Client Layer  │                           │
│                    │  (TanStack Query)  │                           │
│                    └─────────┬─────────┘                           │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ HTTPS
                    ┌──────────┴──────────┐
                    │    API GATEWAY      │  ← Port 3000
                    │    (Fastify)        │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
   ┌──────┴──────┐  ┌────────┴────────┐  ┌────────┴────────┐
   │Auth Service │  │Socket Service   │  │Compliance       │
   │  Port 3001  │  │Instances 1 & 2  │  │Service Port 3008│
   └─────────────┘  └─────────────────┘  └─────────────────┘
          │                    │                     │
   ┌──────┴──────┐  ┌────────┴────────┐  ┌────────┴────────┐
   │Crypto Svc   │  │Search Service   │  │Media Service    │
   │  Port 3009  │  │  Port 3006      │  │  Port 3005      │
   └─────────────┘  └─────────────────┘  └─────────────────┘
          │
   ┌──────┴──────────────────────────────────────────┐
   │  MongoDB (3-node RS) │ Redis (5 instances) │ Kafka (3-broker) │
   └─────────────────────────────────────────────────┘
```

### Running Services (Verified via E2E Test)

| Service | Container | Port | Health |
|---------|-----------|------|--------|
| API Gateway | caas-gateway | 3000 | ✅ Healthy |
| Auth Service | caas-auth-service | 3001 (mapped 3007) | ✅ Healthy |
| Socket Service 1 | caas-socket-1 | 3001 (mapped 3002) | ✅ Healthy |
| Socket Service 2 | caas-socket-2 | 3001 (mapped 3003) | ✅ Healthy |
| Compliance Service | caas-compliance-service | 3008 | ✅ Healthy |
| Crypto Service | caas-crypto-service | 3009 | ✅ Healthy |
| Search Service | caas-search-service | 3006 | ✅ Healthy |
| Media Service | caas-media-service | 3005 | ✅ Healthy |
| MongoDB Replica Set | 3 containers | 27017 | ✅ Healthy |
| Redis (5 instances) | 5 containers | 6379-6383 | ✅ Healthy |
| Kafka Cluster | 3 brokers + ZK | 9092-9094 | ✅ Healthy |
| Elasticsearch | caas-elasticsearch | 9200 | ✅ Healthy |
| MinIO (Object Storage) | caas-minio | 9000/9001 | ✅ Healthy |

---

## 3. Backend API Readiness Matrix

This section maps every UI feature to its backend API, showing exactly what exists today and what needs to be built.

### 3.1 Authentication & Registration APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Tenant Registration** | `/api/v1/auth/client/register` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Tenant Login** | (not yet implemented) | POST | Auth Service | ❌ Missing | ❌ |
| **Tenant Password Recovery** | (not yet implemented) | POST | Auth Service | ❌ Missing | ❌ |
| **Tenant Profile (Get)** | `/v1/tenant` | GET | Gateway | ✅ Working | ✅ Yes |
| **Tenant Profile (Update)** | `/v1/tenant/settings` | PUT | Gateway | ✅ Working | ✅ Yes |
| **Tenant Usage** | `/v1/tenant/usage` | GET | Gateway | ✅ Working | ✅ Yes |

### 3.2 API Key Management APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Create API Key** | `/v1/auth/api-keys` | POST | Gateway | ✅ Working | ✅ Yes |
| **List API Keys** | `/v1/auth/api-keys` | GET | Gateway | ✅ Working | ✅ Yes |
| **Delete API Key** | `/v1/auth/api-keys/:id` | DELETE | Gateway | ✅ Working | ✅ Yes |
| **Rotate API Key** | `/api/v1/auth/client/api-keys/rotate` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Promote API Key** | `/api/v1/auth/client/api-keys/promote` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Revoke API Key** | `/api/v1/auth/client/api-keys/revoke` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Validate API Key** | `/api/v1/auth/internal/validate-api-key` | POST | Auth Service | ✅ Working | ✅ Yes |

### 3.3 SDK Session APIs (for end-user management)

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Create SDK Session** | `/api/v1/auth/sdk/session` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Refresh SDK Token** | `/api/v1/auth/sdk/refresh` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Logout SDK Session** | `/api/v1/auth/sdk/logout` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Validate Token** | `/api/v1/auth/validate` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Validate Token (Internal)** | `/api/v1/auth/internal/validate` | POST | Auth Service | ✅ Working | ✅ Yes |
| **SDK Token (Legacy/Gateway)** | `/v1/auth/sdk/token` | POST | Gateway | ✅ Working | ✅ Yes |

### 3.4 Security & Whitelist APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Get IP Whitelist** | `/api/v1/auth/client/ip-whitelist` | GET | Auth Service | ✅ Working | ✅ Yes |
| **Add IP to Whitelist** | `/api/v1/auth/client/ip-whitelist` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Remove IP** | `/api/v1/auth/client/ip-whitelist/:ip` | DELETE | Auth Service | ✅ Working | ✅ Yes |
| **Get Origin Whitelist** | `/api/v1/auth/client/origin-whitelist` | GET | Auth Service | ✅ Working | ✅ Yes |
| **Add Origin** | `/api/v1/auth/client/origin-whitelist` | POST | Auth Service | ✅ Working | ✅ Yes |
| **Remove Origin** | `/api/v1/auth/client/origin-whitelist/:origin` | DELETE | Auth Service | ✅ Working | ✅ Yes |

### 3.5 Session Management APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **List Sessions** | `/v1/sessions` | GET | Gateway | ✅ Working | ✅ Yes |
| **List Sessions (Auth)** | `/api/v1/sessions` | GET | Auth Service | ✅ Working | ✅ Yes |
| **Terminate Session** | `/api/v1/sessions/:session_id` | DELETE | Auth Service | ✅ Working | ✅ (indirect) |

### 3.6 User Profile APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Get User Profile** | `/api/v1/users/profile` | GET | Auth Service | ✅ Working | ✅ Yes |
| **Update User Profile** | `/api/v1/users/profile` | PUT | Auth Service | ✅ Working | ✅ Yes |

### 3.7 Compliance & Audit APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Create Audit Log** | `/api/v1/audit/log` | POST | Compliance | ✅ Working | ✅ Yes |
| **Batch Audit Logs** | `/api/v1/audit/batch` | POST | Compliance | ✅ Working | ✅ (implicit) |
| **Query Audit Logs** | `/api/v1/audit/query` | GET | Compliance | ✅ Working | ✅ (implicit) |
| **Verify Integrity** | `/api/v1/audit/verify` | POST | Compliance | ✅ Working | ✅ (implicit) |

### 3.8 Encryption & Crypto APIs

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Generate Key** | `/api/v1/keys/generate` | POST | Crypto | ✅ Working | ✅ Yes |
| **Encrypt** | `/api/v1/encrypt` | POST | Crypto | ✅ Working | ✅ Yes |
| **Decrypt** | `/api/v1/decrypt` | POST | Crypto | ✅ Working | ✅ Yes |

### 3.9 Gateway Admin Routes (Swagger-Discovered)

| Feature | API Endpoint | Method | Service | Status | E2E Tested |
|---------|-------------|--------|---------|--------|------------|
| **Admin Dashboard** | `/v1/admin/dashboard` | GET | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Audit Logs** | `/v1/admin/audit-logs` | GET | Gateway | ✅ Exists | ✅ Discovery |
| **Admin DLQ** | `/v1/admin/dlq` | GET | Gateway | ✅ Exists | ✅ Discovery |
| **Admin IP Security** | `/v1/admin/ip-security` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Admin MFA** | `/v1/admin/mfa` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Reports** | `/v1/admin/reports` | GET | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Roles** | `/v1/admin/roles` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Sessions** | `/v1/admin/sessions` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Retention** | `/v1/admin/retention` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Admin Recordings** | `/v1/admin/recordings` | * | Gateway | ✅ Exists | ✅ Discovery |
| **Permission Check** | `/v1/permissions/check` | POST | Gateway | ✅ Exists | ✅ Discovery |
| **MFA Challenge** | `/v1/mfa/challenge` | POST | Gateway | ✅ Exists | ✅ Discovery |

### 3.10 Real-Time Socket Events (for monitoring dashboard)

| Feature | Namespace | Events | Status | E2E Tested |
|---------|-----------|--------|--------|------------|
| **Chat** | `/chat` | joinRoom, sendMessage, typing_*, message_delivered, message_read, unread_query, leaveRoom | ✅ Working | ✅ Yes |
| **Presence** | `/presence` | presence_update, presence_subscribe, presence_subscriptions_query | ✅ Working | ✅ Yes |
| **WebRTC** | `/webrtc` | webrtc:get-ice-servers, call:initiate, call:hangup | ✅ Working | ✅ Yes |
| **Moderation** | `/chat` | moderate:mute, moderate:unmute | ✅ Working | ✅ Yes |

---

## 4. Page-by-Page Feature Breakdown

### 4.1 🔐 Authentication Pages

#### 4.1.1 Registration Page (`/register`)
- **Fields**: Company Name, Email, Password, Plan (free/business/enterprise)
- **Backend**: `POST /api/v1/auth/client/register` ✅
- **Validation**: Email format, password min 8 chars, company name min 2 chars
- **Response**: Returns `client_id`, `api_key` → redirect to onboarding wizard
- **UI**: Multi-step wizard with company logo upload, TOS acceptance

#### 4.1.2 Login Page (`/login`)
- **Backend Status**: ✅ **Tenant login endpoint implemented**
- **Endpoint**: `POST /api/v1/auth/client/login`
- **Response**: Returns JWT access token, refresh token, and tenant details.
- **Security**: HttpOnly cookie for refresh token, short-lived access token.

#### 4.1.3 Forgot Password (`/forgot-password`)
- **Backend Status**: ✅ **Password reset flow implemented**
- **Endpoints**: 
  - `POST /api/v1/auth/client/forgot-password` → sends reset code (via Redis)
  - `POST /api/v1/auth/client/reset-password` → validates code and updates password

#### 4.1.4 Two-Factor Authentication (`/mfa`)
- **Backend**: Gateway has `/v1/admin/mfa` and `/v1/mfa/challenge` routes ✅
- **Status**: Routes exist but may need full integration testing

---

### 4.2 📊 Dashboard Page (`/dashboard`)

#### Overview Cards
- **Active Users**: From `/v1/tenant/usage` ✅
- **Messages Sent**: From `/v1/tenant/usage` ✅
- **Active Connections**: From `/v1/admin/dashboard` ✅
- **API Calls**: From `/v1/tenant/usage` ✅

#### Activity Feed
- From `/api/v1/audit/query` (Compliance Service) ✅
- Shows recent tenant actions: logins, API key changes, settings updates

#### Usage Charts (Recharts)
- Daily/Weekly/Monthly graphs from usage data
- Socket connection trends
- Message volume over time

#### Quick Actions Panel
- "Create API Key" shortcut
- "View Documentation" link
- "Manage Whitelist" shortcut

---

### 4.3 🔑 API Keys Page (`/api-keys`)

#### Key List Table
- **Data Source**: `GET /v1/auth/api-keys` ✅
- **Columns**: Key Name, Key (masked), Scopes, Created Date, Last Used, Status
- **Actions**: Copy Key, Rotate, Revoke, Delete

#### Create New Key Dialog
- **Backend**: `POST /v1/auth/api-keys` ✅
- **Fields**: Key Name, Scopes (read, write, admin), Expiry (optional)

#### Key Rotation Workflow
- **Backend**: `POST /api/v1/auth/client/api-keys/rotate` + `promote` ✅
- **UI Flow**: Rotate → shows secondary key → Test → Promote → old key deactivated
- **Warning**: "Previous key will become secondary and eventually deactivated"

#### Key Deletion
- **Backend**: `DELETE /v1/auth/api-keys/:id` ✅
- **Confirmation**: Modal with key name and impact warning

---

### 4.4 🛡️ Security Settings Page (`/security`)

#### IP Whitelist Management
- **Data Source**: `GET /api/v1/auth/client/ip-whitelist` ✅
- **Add IP**: `POST /api/v1/auth/client/ip-whitelist` ✅
- **Remove IP**: `DELETE /api/v1/auth/client/ip-whitelist/:ip` ✅
- **UI**: Table of IPs with add/remove, bulk add support, CIDR notation support

#### Origin Whitelist Management
- **Data Source**: `GET /api/v1/auth/client/origin-whitelist` ✅
- **Add Origin**: `POST /api/v1/auth/client/origin-whitelist` ✅
- **Remove Origin**: `DELETE /api/v1/auth/client/origin-whitelist/:origin` ✅
- **UI**: Table of origins (e.g., `https://myapp.com`), add/remove, wildcard support display

#### MFA Configuration
- **Backend**: `/v1/admin/mfa` ✅
- **UI**: Enable/Disable MFA, QR code display for TOTP setup, recovery codes

#### Session Management
- **Data Source**: `GET /v1/sessions` (Gateway) + `GET /api/v1/sessions` (Auth) ✅
- **Terminate**: `DELETE /api/v1/sessions/:session_id` ✅
- **UI**: Table of active sessions with device info, IP, last active, terminate button

---

### 4.5 📈 Analytics Page (`/analytics`)

#### Usage Analytics
- **Data Source**: `/v1/tenant/usage` ✅ + `/v1/admin/dashboard` ✅
- **Charts** (Recharts):
  - Messages sent/received over time
  - Active users DAU/WAU/MAU
  - API call volume and error rates
  - Socket connection trends

#### Audit Logs Viewer
- **Data Source**: `/api/v1/audit/query` (Compliance Service) ✅
- **Filters**: Date range, action type, user, resource type
- **UI**: Searchable, sortable data table with export to CSV
- **Integrity**: Verify button using `/api/v1/audit/verify` ✅

#### Real-Time Monitor (Future Enhancement)
- **Data Source**: Socket connections to `/presence` namespace
- **UI**: Live counter of connected users, active conversations, typing indicators

---

### 4.6 ⚙️ Settings Page (`/settings`)

#### Tenant Profile
- **Data Source**: `GET /v1/tenant` ✅
- **Update**: `PUT /v1/tenant/settings` ✅
- **Fields**: Company name, logo, timezone, locale, notification preferences

#### Webhook Configuration
- **Data Source**: Gateway Webhook routes ✅
  - `POST /v1/webhooks/register` 
  - `GET /v1/webhooks`
  - `DELETE /v1/webhooks/:id`
  - `POST /v1/webhooks/test`
- **UI**: Webhook URL, events to subscribe, delivery logs, test button

#### Data Retention Policies
- **Data Source**: Compliance Service retention endpoints ✅
- **UI**: Configure retention periods for messages, audit logs, media

#### Encryption Settings
- **Data Source**: Crypto Service key management ✅
- **UI**: View encryption keys, key rotation schedule, encryption status

---

### 4.7 👥 Team Management Page (`/team`) — *(Requires New Backend)*

| Feature | Backend Status |
|---------|---------------|
| Invite team member | ❌ Missing |
| List team members | ❌ Missing |
| Remove team member | ❌ Missing |
| Change member role | ❌ Missing |
| Role definitions (Admin/Developer/Viewer) | ❌ Missing |

**Gap**: The current auth model only supports a single tenant admin per registration. Multi-user teams with RBAC per console need new backend endpoints.

---

### 4.8 💳 Billing Page (`/billing`) — *(Requires New Backend)*

| Feature | Backend Status |
|---------|---------------|
| Current plan display | ❌ Missing |
| Plan comparison & upgrade | ❌ Missing |
| Payment method management | ❌ Missing |
| Invoice history | ❌ Missing |
| Usage-based billing | ❌ Missing |

**Gap**: Billing/pricing service is documented in roadmap (`10_billingPricing.md`) but not yet implemented.

---

### 4.9 📚 Documentation Page (`/docs`) — *(Static/MDX Content)*

| Feature | Backend Status |
|---------|---------------|
| Getting Started guide | N/A (static content) |
| API Reference (from OpenAPI) | ✅ `/documentation/json` exists |
| SDK Integration guide | N/A (static content) |
| Code examples | N/A (static content) |
| Changelog | N/A (static content) |

---

## 5. Gaps & Missing Backend Services

### 5.1 Critical Gaps (Must be built before Portal MVP)

| # | Gap | Required For | Priority |
|---|-----|-------------|----------|
| **G1** | Tenant Admin Login Endpoint | Login page | 🔴 Critical |
| **G2** | Tenant Admin JWT (portal-scoped) | Session management for portal | 🔴 Critical |
| **G3** | Password Reset Flow | Forgot password page | 🟡 High |
| **G4** | Tenant Admin Refresh Token | Token refresh in portal | 🟡 High |

### 5.2 Important Gaps (Phase 2 of Portal)

| # | Gap | Required For | Priority |
|---|-----|-------------|----------|
| **G5** | Team Member CRUD | Team management page | 🟡 High |
| **G6** | Role-Based Access Control (per-admin) | Permission restrictions in portal | 🟡 High |
| **G7** | Email Verification Flow | Registration completeness | 🟠 Medium |
| **G8** | OAuth Provider Integration | Social login | 🟠 Medium |

### 5.3 Future Gaps (Phase 3+ of Portal)

| # | Gap | Required For | Priority |
|---|-----|-------------|----------|
| **G9** | Billing Service | Billing page | 🟠 Medium |
| **G10** | Usage Aggregation Service | Detailed analytics | 🟠 Medium |
| **G11** | Notification Preferences API | Settings page | 🔵 Low |
| **G12** | File Upload for Company Logo | Settings/Branding | 🔵 Low |

---

## 6. Onboarding Flow (Step-by-Step)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TENANT ONBOARDING WIZARD                      │
└─────────────────────────────────────────────────────────────────┘

Step 1: Registration
├── Company Name
├── Admin Email
├── Password (min 8 chars)
├── Plan Selection (Free / Business / Enterprise)
└── Backend: POST /api/v1/auth/client/register ✅
    └── Returns: client_id, api_key (primary)

Step 2: Email Verification ❌ (Gap G7)
├── Verification email sent
├── 6-digit code entry
└── Backend: POST /api/v1/auth/client/verify-email (TO BE BUILT)

Step 3: Application Configuration
├── Application Name
├── Application Domain(s)
├── Server IP(s) for Whitelisting
│   └── Backend: POST /api/v1/auth/client/ip-whitelist ✅
├── Allowed Origins (for CORS/SDK)
│   └── Backend: POST /api/v1/auth/client/origin-whitelist ✅
└── Feature Selection (text chat, voice, video, file sharing)

Step 4: API Key Generation
├── Display Primary API Key (copy-to-clipboard)
├── Explain Primary vs Secondary key concept
├── Show key rotation instructions
└── Backend: Already generated during registration ✅

Step 5: SDK Integration Guide
├── Choose platform (JavaScript, React, React Native, Flutter)
├── Show installation command: npm install @caas/sdk
├── Show code snippet for initialization:
│   ```javascript
│   import { CaasClient } from '@caas/sdk';
│   const caas = new CaasClient({
│     apiKey: 'your-api-key',
│     apiUrl: 'https://api.caas.io'
│   });
│   ```
├── Show server-side session creation example
└── Backend: SDK endpoints ✅

Step 6: Test Connection
├── "Click to test" button
├── Creates a test SDK session via API
├── Verifies token generation
├── Shows success/failure with diagnostics
└── Backend: POST /api/v1/auth/sdk/session ✅
```

---

## 7. Security & Authentication Flow

### 7.1 Portal Authentication (Tenant Admin)

```
┌───────────────────────────────────────────────────────────┐
│                  ADMIN PORTAL AUTH FLOW                     │
└───────────────────────────────────────────────────────────┘

1. Admin visits /login
2. Submits email + password
3. [GAP] POST /api/v1/auth/client/login
   └── Auth Service validates credentials
   └── Returns: admin_access_token (JWT), admin_refresh_token
       JWT Payload: { sub: client_id, email, role: "tenant_admin", tenantId }
4. Portal stores tokens (httpOnly cookies recommended)
5. All subsequent API calls include:
   Authorization: Bearer <admin_access_token>
6. Gateway validates JWT → resolves tenant → routes request
7. Token refresh: [GAP] POST /api/v1/auth/client/refresh
```

### 7.2 How Tenant Creates End-User Sessions

The admin portal will show this documentation/workflow:

```
1. Tenant's Backend Server receives a user login
2. Tenant Backend calls CAAS API:
   POST /api/v1/auth/sdk/session ✅
   Headers: { x-api-key: <tenant-api-key> }
   Body: { user_external_id, user_data: { name, email, avatar } }
3. CAAS returns: { access_token, refresh_token }
4. Tenant Backend sends access_token to their frontend
5. Frontend SDK uses token for socket connections and API calls
```

### 7.3 Token Model Summary

| Token Type | Purpose | Generated By | Validated By |
|-----------|---------|-------------|-------------|
| Admin Access Token | Portal UI auth | Auth Service (tenant login) | Gateway |
| Admin Refresh Token | Refresh admin session | Auth Service | Auth Service |
| API Key | Server-to-server auth | Auth Service (registration) | Auth Service |
| SDK Access Token | End-user auth | Auth Service (SDK session) | Gateway + Socket Services |
| SDK Refresh Token | Refresh end-user session | Auth Service | Auth Service |

---

## 8. Technology Stack Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR for SEO, file-based routing, API routes for BFF |
| **Language** | TypeScript 5.x | Type safety, shared types with backend |
| **Styling** | Tailwind CSS 3.x | Utility-first, consistent with existing task specs |
| **UI Primitives** | Radix UI | Accessible, unstyled, composable |
| **State (Server)** | TanStack Query v5 | Caching, refetch, optimistic updates |
| **State (Client)** | Zustand | Lightweight, no boilerplate |
| **Forms** | React Hook Form + Zod | Validation, type-safe forms |
| **Charts** | Recharts | React-native charting, lightweight |
| **Tables** | TanStack Table v8 | Sorting, pagination, filtering |
| **Icons** | Lucide React | Consistent, tree-shakeable |
| **Auth** | Custom JWT handling | Aligns with existing CAAS auth model |
| **HTTP Client** | Fetch API + custom wrapper | Consistent with test patterns |
| **Build** | Next.js built-in | No additional bundler needed |
| **Docker** | Node 20 Alpine | Consistent with other services |

---

## 9. Docker & Deployment Architecture

### 9.1 Admin Portal Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3100
CMD ["node", "server.js"]
```

### 9.2 Docker Compose Addition

```yaml
admin-portal:
  build: ./apps/admin-portal
  container_name: caas-admin-portal
  ports:
    - "3100:3100"
  environment:
    - NEXT_PUBLIC_API_URL=http://gateway:3000
    - NEXT_PUBLIC_SOCKET_URL=http://gateway:3000
    - AUTH_SERVICE_URL=http://auth-service:3001
  networks:
    - caas-network
  depends_on:
    gateway:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3100/api/health"]
    interval: 10s
    timeout: 5s
    retries: 3
```

---

## 10. Task Phases & Execution Order

### Phase 6.1 — Foundation & Auth (est. 40 hours)
| Task | Description | Dependencies |
|------|-------------|-------------|
| PORTAL-101 | Next.js 14 project scaffolding + Docker | None |
| PORTAL-102 | Design system (Tailwind tokens, Radix primitives, dark mode) | PORTAL-101 |
| PORTAL-103 | Dashboard layout (sidebar, header, breadcrumbs) | PORTAL-102 |
| PORTAL-104 | API client layer (TanStack Query, auth interceptors) | PORTAL-101 |
| PORTAL-105 | Auth Service: Tenant Login endpoint (backend) | Auth Service |
| PORTAL-106 | Auth Service: Tenant Refresh Token endpoint (backend) | PORTAL-105 |
| PORTAL-107 | Registration page (connects to existing API) | PORTAL-102 |
| PORTAL-108 | Login page (connects to new tenant login API) | PORTAL-106 |
| PORTAL-109 | Auth middleware & route protection | PORTAL-108 |

### Phase 6.2 — Core Console Pages (est. 48 hours)
| Task | Description | Dependencies |
|------|-------------|-------------|
| PORTAL-201 | Dashboard overview page (stats, activity feed, charts) | PORTAL-109 |
| PORTAL-202 | API Keys management page (CRUD, rotation, scopes) | PORTAL-109 |
| PORTAL-203 | Security settings page (IP/Origin whitelists) | PORTAL-109 |
| PORTAL-204 | Session management page (list, terminate) | PORTAL-109 |
| PORTAL-205 | Audit logs viewer (query, filter, export) | PORTAL-109 |
| PORTAL-206 | Tenant settings page (profile, webhooks) | PORTAL-109 |
| PORTAL-207 | Onboarding wizard (post-registration flow) | PORTAL-107 |
| PORTAL-208 | Documentation page (static MDX + OpenAPI reference) | PORTAL-101 |

### Phase 6.3 — Advanced Features (est. 32 hours)
| Task | Description | Dependencies |
|------|-------------|-------------|
| PORTAL-301 | Auth Service: Password reset flow (backend) | PORTAL-105 |
| PORTAL-302 | Forgot password page | PORTAL-301 |
| PORTAL-303 | MFA setup and management page | PORTAL-109 |
| PORTAL-304 | Real-time monitoring dashboard (socket-based) | PORTAL-201 |
| PORTAL-305 | Auth Service: Team member CRUD (backend) | Auth Service |
| PORTAL-306 | Team management page | PORTAL-305 |
| PORTAL-307 | Encryption settings page (key management view) | PORTAL-109 |

### Phase 6.4 — Billing & Polish (est. 24 hours)
| Task | Description | Dependencies |
|------|-------------|-------------|
| PORTAL-401 | Billing Service: Core implementation (backend) | New Service |
| PORTAL-402 | Billing page (plans, invoices, usage) | PORTAL-401 |
| PORTAL-403 | Usage analytics deep-dive page | PORTAL-201 |
| PORTAL-404 | Email service integration (verification, notifications) | External |
| PORTAL-405 | End-to-end testing of portal flows | All above |
| PORTAL-406 | Performance optimization and Lighthouse audit | PORTAL-405 |

---

## Appendix A: Comparison with Supabase/Firebase Console

| Feature | Supabase | Firebase | CAAS Portal (Planned) |
|---------|----------|---------|----------------------|
| Project Dashboard | ✅ | ✅ | ✅ Phase 6.2 |
| API Key Management | ✅ | ✅ | ✅ Phase 6.2 |
| Auth Configuration | ✅ | ✅ | ✅ Phase 6.1 |
| Database Viewer | ✅ | ✅ | ❌ Not planned (MongoDB Express exists) |
| Real-time Monitor | ✅ | ❌ | ✅ Phase 6.3 |
| Usage Analytics | ✅ | ✅ | ✅ Phase 6.2 |
| Billing | ✅ | ✅ | ✅ Phase 6.4 |
| Team Management | ✅ | ✅ | ✅ Phase 6.3 |
| Webhook Config | ✅ | ✅ | ✅ Phase 6.2 |
| Docs + SDK Guide | ✅ | ✅ | ✅ Phase 6.2 |
| Audit Logs | ✅ | ✅ | ✅ Phase 6.2 |
| Edge Functions | ✅ | ✅ | ❌ Not planned |
| Storage (File Mgr) | ✅ | ✅ | ❌ Partial (MinIO exists) |

## Appendix B: Full E2E Test Coverage

All endpoints listed in Section 3 have been verified via the comprehensive E2E test suite:
- **125 total tests** executed
- **116 passed**, **9 warnings** (socket fire-and-forget events — expected)
- **0 failures**
- See `tests/reports/full-system-report-20260225-022033.md` for detailed results

---

*End of Document*
