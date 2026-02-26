# Phase 6: Client-Facing UI

## Overview

This phase covers the **Admin Portal** — the client-facing web application for SAAS tenant administrators to onboard, configure, and manage their CAAS integration. This is analogous to Supabase Dashboard or Firebase Console.

> **Detailed Plan**: See [`docs/CLIENT_FACING_UI_PLAN.md`](../../docs/CLIENT_FACING_UI_PLAN.md) for the comprehensive feature breakdown, backend readiness matrix, and gap analysis.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ADMIN PORTAL (Next.js 14)                      │
│                           Port 3100                                  │
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
                    │    API GATEWAY      │  Port 3000 ✅
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────────┐
          │                    │                         │
   ┌──────┴──────┐  ┌────────┴────────┐  ┌────────────┴────────┐
   │Auth Service │  │Compliance Svc   │  │Other Services       │
   │  Port 3001  │  │  Port 3008      │  │(Crypto,Search,etc)  │
   └─────────────┘  └─────────────────┘  └─────────────────────┘
```

## Backend Readiness Summary

Based on E2E System Test (125 tests, 0 failures — Feb 25, 2026):

| Category | APIs Working | APIs Missing |
|----------|-------------|-------------|
| **Registration** | ✅ Register | ❌ Login, Password Reset |
| **API Keys** | ✅ Full CRUD + Rotate/Promote/Revoke | — |
| **Security** | ✅ IP & Origin Whitelists | — |
| **Sessions** | ✅ List + Terminate | — |
| **User Profile** | ✅ Get + Update | — |
| **Audit Logs** | ✅ Log + Query + Verify | — |
| **Webhooks** | ✅ Register + List + Test + Delete | — |
| **Tenant** | ✅ Info + Settings + Usage | — |
| **Team Management** | — | ❌ Full CRUD needed |
| **Billing** | — | ❌ Entire service needed |

## Task Structure

### Phase 6.1 — Foundation & Auth (56 hours)

1. **`admin-portal/01-portal-setup.json`** — Setup (4 tasks, 24h)
   - `PORTAL-101` — Next.js scaffolding + Docker
   - `PORTAL-102` — Design system (Tailwind, Radix, dark mode)
   - `PORTAL-103` — Dashboard layout (sidebar, header, breadcrumbs)
   - `PORTAL-104` — API client layer (TanStack Query, hooks)

2. **`admin-portal/02-auth-pages.json`** — Authentication (5 tasks, 32h)
   - `PORTAL-105` — **Backend**: Tenant admin login endpoint (**GAP**)
   - `PORTAL-106` — **Backend**: Tenant admin refresh token (**GAP**)
   - `PORTAL-107` — Registration page (uses existing API ✅)
   - `PORTAL-108` — Login page (uses PORTAL-105)
   - `PORTAL-109` — Auth middleware & route protection

### Phase 6.2 — Core Console Pages (48 hours)

3. **`admin-portal/03-dashboard-pages.json`** — Console Pages (7 tasks, 48h)
   - `PORTAL-201` — Dashboard overview (stats, charts, activity feed)
   - `PORTAL-202` — API Keys management (full CRUD + rotation)
   - `PORTAL-203` — Security settings (IP/Origin whitelists, sessions)
   - `PORTAL-204` — Audit logs viewer (query, filter, export)
   - `PORTAL-205` — Tenant settings (profile, webhooks)
   - `PORTAL-206` — Onboarding wizard (6-step post-registration)
   - `PORTAL-207` — Documentation page (MDX + OpenAPI reference)

### Phase 6.3-6.4 — Advanced Features (56 hours)

4. **`admin-portal/04-advanced-features.json`** — Advanced (8 tasks, 56h)
   - `PORTAL-301` — **Backend**: Password reset flow (**GAP**)
   - `PORTAL-302` — Forgot password page
   - `PORTAL-303` — MFA setup and management
   - `PORTAL-304` — Real-time monitoring dashboard
   - `PORTAL-305` — **Backend**: Team member CRUD (**GAP**)
   - `PORTAL-306` — Team management page
   - `PORTAL-401` — Billing page (stub)
   - `PORTAL-402` — E2E testing & polish

**Total Admin Portal Tasks: 24 tasks / ~180 hours**

### Other Feature Areas (Existing — unchanged)

5. **`sdk/01-sdk-core.json`** — JavaScript SDK core (6 tasks)
6. **`sdk/02-sdk-realtime.json`** — SDK real-time features (4 tasks)
7. **`components/01-component-setup.json`** — Component library setup (3 tasks)
8. **`components/02-core-components.json`** — Core chat components (5 tasks)
9. **`components/03-advanced-components.json`** — Advanced components (4 tasks)
10. **`widget/01-widget-core.json`** — Chat widget core (4 tasks)
11. **`widget/02-widget-customization.json`** — Widget customization (4 tasks)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS 3.x |
| UI Primitives | Radix UI |
| State (Server) | TanStack Query v5 |
| State (Client) | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Icons | Lucide React |
| Docker | Node 20 Alpine |

## Critical Dependencies

- **Phase 4.5**: Auth Service (standalone REST API) ✅ Complete
- **Phase 3**: Socket.IO integration ✅ Complete  
- **Phase 2**: Security & authentication ✅ Complete
- **Phase 1**: Core infrastructure ✅ Complete

## Key Design Decisions

### Analytics Dashboards
Built INTO the admin portal using Recharts and TanStack Table. This is NOT Grafana — Grafana is only for internal CAAS platform monitoring.

### Backend-First Gaps
Tasks PORTAL-105, PORTAL-106, PORTAL-301, PORTAL-305 are **backend tasks** that must be built in the Auth Service before the corresponding frontend pages can function. These are clearly marked with gap IDs (G1-G5) in the plan document.

### Authentication Model
The portal uses a **separate JWT** from SDK tokens. Portal JWTs have `role: "tenant_admin"` and authenticate console access. SDK tokens have `role: "sdk_user"` and authenticate end-user chat access.
