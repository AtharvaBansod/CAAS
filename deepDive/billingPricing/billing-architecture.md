# Billing Service - Architecture

> **Parent Roadmap**: [Billing & Pricing](../../roadmaps/10_billingPricing.md)

---

## Overview

Core billing service architecture for subscription management, usage tracking, and payment processing.

---

## 1. Service Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Billing Service                    │
├─────────────┬─────────────┬─────────────┬───────────┤
│Subscription │   Usage     │  Payment    │  Invoice  │
│   Manager   │   Metering  │  Processor  │  Service  │
└──────┬──────┴──────┬──────┴──────┬──────┴─────┬─────┘
       │             │             │            │
       └─────────────┴─────────────┴────────────┘
                         │
              ┌──────────┴──────────┐
              │   Stripe API        │
              └─────────────────────┘
```

---

## 2. Subscription Management

### Subscription Lifecycle
```typescript
interface Subscription {
  id: string;
  clientId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';
  currentPeriod: { start: Date; end: Date };
  billingCycle: 'monthly' | 'yearly';
  stripeSubscriptionId: string;
}

class SubscriptionManager {
  async create(clientId: string, planId: string): Promise<Subscription>;
  async upgrade(subscriptionId: string, newPlanId: string): Promise<Subscription>;
  async cancel(subscriptionId: string, immediate: boolean): Promise<void>;
  async reactivate(subscriptionId: string): Promise<Subscription>;
}
```

### Proration Calculation
```typescript
function calculateProration(
  currentPlan: Plan,
  newPlan: Plan,
  daysRemaining: number
): number {
  const dailyDiff = (newPlan.price - currentPlan.price) / 30;
  return dailyDiff * daysRemaining;
}
```

---

## 3. Usage Metering Pipeline

```
[Socket/API Events] → [Kafka] → [Usage Aggregator] → [Usage DB]
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                   [Real-time          [Batch
                    Dashboard]          Billing]
```

### Metering Dimensions
| Metric | Aggregation | Storage |
|--------|-------------|---------|
| Messages | Count/day | TimescaleDB |
| Active Users | Unique/month | Redis HyperLogLog |
| API Calls | Count/hour | TimescaleDB |
| Storage | Sum (bytes) | PostgreSQL |

---

## 4. Stripe Integration

### Webhook Handling
```typescript
const webhookHandlers = {
  'invoice.paid': async (event) => {
    await markInvoicePaid(event.data.object.id);
    await updateSubscriptionStatus(event.data.object.subscription, 'active');
  },
  'invoice.payment_failed': async (event) => {
    await handlePaymentFailure(event.data.object);
    await notifyClient(event.data.object.customer);
  },
  'customer.subscription.deleted': async (event) => {
    await deactivateSubscription(event.data.object.id);
  }
};
```

### Sync Strategy
- Stripe is source of truth for payment status
- Local DB caches subscription state
- Webhooks trigger local updates
- Periodic reconciliation job

---

## 5. Invoice Generation

### Invoice Structure
```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;  // INV-2024-00001
  clientId: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date;
  pdfUrl: string;
}
```

### Generation Flow
1. End of billing period trigger
2. Calculate subscription charges
3. Calculate usage overages
4. Apply credits/discounts
5. Calculate taxes
6. Generate PDF
7. Send to customer

---

## 6. Dunning Management

```
Payment Failed → Retry Day 1 → Retry Day 3 → Retry Day 7
                                                   │
                                          Account Degraded
                                                   │
                                       Day 14: Service Limited
                                                   │
                                       Day 30: Account Suspended
```

---

## Related Documents
- [Pricing Strategy](./pricing-strategy.md)
- [Usage Metering](./usage-metering.md)
- [Payment Flow](../../flowdiagram/payment-flow.md)
