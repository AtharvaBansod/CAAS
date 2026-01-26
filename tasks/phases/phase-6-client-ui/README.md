# Phase 6: Client-Facing UI

## Overview

This phase covers the client-facing user interface including the admin portal, SDK, and reusable UI components. This is what tenant administrators and end-users interact with.

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client-Facing UI Layer                           │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │   Admin Portal  │  │   Embeddable    │  │    Component         │   │
│  │   (Next.js)     │  │   Chat Widget   │  │    Library           │   │
│  │                 │  │   (React)       │  │    (Storybook)       │   │
│  └─────────────────┘  └─────────────────┘  └──────────────────────┘   │
│           │                   │                      │                  │
│           └───────────────────┼──────────────────────┘                  │
│                               │                                         │
│                    ┌──────────┴──────────┐                             │
│                    │   JavaScript SDK    │                             │
│                    │   (@caas/sdk)       │                             │
│                    └──────────┬──────────┘                             │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │    API Gateway        │
                    │    + Socket.IO        │
                    └───────────────────────┘
```

## Feature Areas

### 1. Admin Portal (`admin-portal/`)
- Tenant dashboard for managing applications
- User management interface
- Analytics dashboards (NOT Grafana - in-app React components)
- API key management
- Billing and subscription management

### 2. JavaScript SDK (`sdk/`)
- TypeScript SDK for browser and Node.js
- Socket.IO client wrapper
- REST API client
- Authentication helpers
- Real-time message handling

### 3. UI Components (`components/`)
- Reusable React component library
- Storybook documentation
- Theme customization
- Accessibility compliance

### 4. Chat Widget (`widget/`)
- Embeddable chat widget
- Customizable appearance
- Lightweight bundle
- Easy integration

## Technology Stack

### Frontend Framework
- **Next.js 14** - Admin portal with App Router
- **React 18** - UI components
- **TypeScript 5.x** - Type safety

### State Management
- **TanStack Query** - Server state
- **Zustand** - Client state

### Styling
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Accessible primitives
- **CSS Variables** - Theming

### Build Tools
- **Turborepo** - Monorepo management
- **Vite** - SDK and widget bundling
- **Rollup** - Component library packaging

## Task Groups

1. **admin-portal/** - Admin interface (12 tasks)
   - `01-portal-setup.json` - Next.js setup, layout, API client (4 tasks)
   - `02-auth-pages.json` - Authentication pages (3 tasks)
   - `03-dashboard-pages.json` - Dashboard, apps, users, analytics (5 tasks)

2. **sdk/** - JavaScript SDK (10 tasks)
   - `01-sdk-core.json` - SDK setup, client, API clients (6 tasks)
   - `02-sdk-realtime.json` - Socket.IO, presence, React hooks (4 tasks)

3. **components/** - UI component library (12 tasks)
   - `01-component-setup.json` - Package setup, theming, primitives (3 tasks)
   - `02-core-components.json` - Message, MessageList, ConversationList (5 tasks)
   - `03-advanced-components.json` - Media, reactions, threads (4 tasks)

4. **widget/** - Embeddable chat widget (8 tasks)
   - `01-widget-core.json` - Bundle, launcher, window, state (4 tasks)
   - `02-widget-customization.json` - Theming, forms, notifications, API (4 tasks)

**Total Phase 6 Tasks: 42 tasks**

## Dependencies

- Phase 2 Security: Authentication, API keys
- Phase 3 Real-Time: Socket.IO integration
- Phase 4 Messaging: Message display
- Phase 5 Analytics: Dashboard data (analytics service, not Grafana)

## Key Design Decisions

### Analytics Dashboards
Analytics and visualization are built INTO clientFacingUI using:
- **Recharts** - Chart library
- **TanStack Table** - Data tables
- Analytics service API for data

This is NOT Grafana. Grafana is only for internal CAAS platform monitoring.

### Component Library
Shared components between admin portal and chat widget:
- Avatar, Badge, Button, Input
- Message bubbles, Conversation list
- Loading states, Error boundaries

### SDK Design
- Tree-shakeable for minimal bundle size
- Works in browser and Node.js
- TypeScript-first with excellent IntelliSense
- Automatic reconnection and error handling
