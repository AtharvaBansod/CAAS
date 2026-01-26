# Usage Metering Feature

## Overview

Track and aggregate usage metrics for billing purposes. Captures message counts, API calls, MAU (Monthly Active Users), and media storage usage.

## Architecture

```
Usage Events → Kafka → Metering Service → Aggregation → MongoDB
                                ↓
                        Quota Enforcement
```

## Metrics Tracked

1. **Messages** - Total messages sent per tenant
2. **MAU** - Monthly active users (unique users with activity)
3. **API Calls** - Requests to public API
4. **Media Storage** - Bytes stored
5. **Bandwidth** - Data transfer

## Task Files

- `01-metering-service.json` - Core metering service
- `02-quota-enforcement.json` - Quota limits and enforcement
