# Payment Processing Flow

> Visual flow diagram for payment lifecycle from initiation to completion.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Billing Cycle End] --> B[Calculate Invoice]
    B --> C[Create Stripe Invoice]
    C --> D{Auto-Pay Enabled?}
    
    D -->|Yes| E[Charge Payment Method]
    D -->|No| F[Send Invoice Email]
    
    E --> G{Payment Successful?}
    G -->|Yes| H[Mark Invoice Paid]
    G -->|No| I[Enter Retry Flow]
    
    F --> J[Customer Pays Manually]
    J --> H
    
    I --> K[Retry Day 1]
    K --> L{Success?}
    L -->|Yes| H
    L -->|No| M[Retry Day 3]
    M --> N{Success?}
    N -->|Yes| H
    N -->|No| O[Retry Day 7]
    O --> P{Success?}
    P -->|Yes| H
    P -->|No| Q[Mark Past Due]
    
    Q --> R[Notify Customer]
    R --> S[Grace Period 7 Days]
    S --> T{Payment Received?}
    T -->|Yes| H
    T -->|No| U[Suspend Account]
    
    H --> V[Update Subscription]
    V --> W[Send Receipt]
    W --> X[End]
```

---

## Payment States

| State | Description | Action |
|-------|-------------|--------|
| pending | Invoice created | Await payment |
| processing | Payment in progress | Wait for webhook |
| paid | Successfully charged | Activate features |
| failed | Payment declined | Enter retry |
| past_due | All retries failed | Grace period |
| refunded | Money returned | Adjust records |

---

## Stripe Webhook Events

```typescript
const paymentWebhooks = {
  'payment_intent.succeeded': handlePaymentSuccess,
  'payment_intent.payment_failed': handlePaymentFailure,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'charge.refunded': handleRefund
};
```

---

## Related Documents
- [Billing Architecture](../deepDive/billingPricing/billing-architecture.md)
- [Invoice Generation](./invoice-generation.md)
