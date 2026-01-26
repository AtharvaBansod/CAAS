# Analytics Feature

## Overview

Client-facing analytics dashboards built into the clientFacingUI application. These are NOT internal Grafana dashboards - they are React-based analytics views for tenant administrators and end users.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Facing UI                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              React Analytics Dashboard                   │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │  Charts     │ │   Tables    │ │   Metrics   │       │ │
│  │  │  (Recharts) │ │  (TanStack) │ │   Cards     │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┬┘
                                                               │
                         REST API                              │
                                                               │
┌─────────────────────────────────────────────────────────────▼┐
│                    Analytics Service                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐  │
│  │ Aggregation     │ │ Report          │ │ Export         │  │
│  │ Engine          │ │ Generator       │ │ Service        │  │
│  └─────────────────┘ └─────────────────┘ └────────────────┘  │
└────────────────┬──────────────────────────────────────────────┘
                 │
    ┌────────────┴───────────────┐
    ▼                            ▼
┌─────────────────┐     ┌─────────────────┐
│    MongoDB      │     │   TimeSeries    │
│  (Raw Events)   │     │   (Aggregated)  │
└─────────────────┘     └─────────────────┘
```

## Key Features

### Tenant Admin Dashboard
- Message volume charts
- User activity metrics
- Active users over time
- Storage usage
- API call statistics

### User Analytics
- Personal usage statistics
- Communication patterns
- Device usage breakdown

### Export Capabilities
- CSV export
- PDF reports
- Scheduled reports

## Technology Stack

### Frontend (clientFacingUI)
- **React 18** - UI framework
- **Recharts** - Chart library
- **TanStack Table** - Data tables
- **TanStack Query** - Data fetching

### Backend (Analytics Service)
- **Fastify** - API framework
- **MongoDB Aggregation** - Data processing
- **Node.js Worker Threads** - Heavy computations

## Difference from Internal Monitoring

| Aspect | Client Analytics | Internal Monitoring |
|--------|------------------|---------------------|
| Users | Tenant admins | Platform engineers |
| Tool | clientFacingUI | Grafana |
| Metrics | Business metrics | System metrics |
| Access | Per-tenant | Global |
| Purpose | Usage insights | Debugging/Ops |

## Task Groups

1. **analytics-service.json** - Backend aggregation and API
2. **tenant-dashboard.json** - Tenant admin dashboards in clientFacingUI
3. **reporting.json** - Reports and exports

## Dependencies

- Phase 1: MongoDB (data source)
- Phase 4: Messages, Conversations (data to analyze)
- Phase 5 Metrics: Prometheus (system metrics - internal only)
