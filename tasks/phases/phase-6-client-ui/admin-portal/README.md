# Admin Portal Feature

## Overview

Next.js-based admin portal for tenant administrators to manage their chat applications, users, API keys, and view analytics.

## Architecture

```
apps/admin-portal/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, register)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── applications/  # Application management
│   │   │   ├── users/         # User management
│   │   │   ├── analytics/     # Analytics dashboards
│   │   │   ├── api-keys/      # API key management
│   │   │   ├── billing/       # Billing & subscriptions
│   │   │   └── settings/      # Tenant settings
│   │   └── layout.tsx
│   ├── components/            # Portal-specific components
│   ├── features/              # Feature modules
│   ├── lib/                   # Utilities
│   └── styles/                # Global styles
├── package.json
└── next.config.js
```

## Key Pages

### Dashboard Home
- Overview metrics
- Recent activity
- Quick actions

### Applications
- Create/manage chat applications
- Configure webhooks
- Set up custom domains

### Users
- View registered users
- Manage roles and permissions
- User activity logs

### Analytics
- Message volume charts
- User activity metrics
- API usage statistics
- Built with Recharts (NOT Grafana)

### API Keys
- Generate API keys
- Manage scopes
- Rotate keys

### Billing
- Current plan
- Usage metrics
- Invoice history
- Payment methods

## Task Groups

1. **01-portal-setup.json** - Project setup and layout
2. **02-auth-pages.json** - Authentication pages
3. **03-dashboard-pages.json** - Main dashboard pages

## Technologies

- Next.js 14 with App Router
- TanStack Query for data fetching
- Tailwind CSS + Radix UI
- React Hook Form + Zod validation
