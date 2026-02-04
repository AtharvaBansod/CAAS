# Invoice Generation Flow

> Visual flow for invoice creation and delivery.

---

## Flow Diagram

```mermaid
flowchart TD
    A[Billing Period Ends] --> B[Trigger Invoice Job]
    B --> C[Get Subscription Details]
    C --> D[Get Usage Data]
    D --> E[Calculate Overages]
    
    E --> F[Build Line Items]
    F --> G[Apply Discounts]
    G --> H[Calculate Tax]
    H --> I[Create Invoice Record]
    
    I --> J[Generate PDF]
    J --> K[Upload to Storage]
    K --> L[Send to Stripe]
    
    L --> M{Auto-Collect?}
    M -->|Yes| N[Charge Payment Method]
    M -->|No| O[Send Invoice Email]
    
    N --> P{Payment Success?}
    P -->|Yes| Q[Mark Paid]
    P -->|No| R[Enter Retry Flow]
    
    O --> S[Customer Downloads PDF]
    S --> T[Customer Pays]
    T --> Q
    
    Q --> U[Send Receipt]
    U --> V[End]
```

---

## Invoice Lifecycle

```typescript
type InvoiceStatus = 
  | 'draft'        // Being prepared
  | 'open'         // Sent to customer
  | 'paid'         // Successfully paid
  | 'past_due'     // Payment overdue
  | 'void'         // Canceled
  | 'uncollectible'; // Write-off
```

---

## Invoice Number Format

```typescript
function generateInvoiceNumber(tenantId: string): string {
  const year = new Date().getFullYear();
  const sequence = await getNextSequence(tenantId, year);
  
  return `INV-${year}-${String(sequence).padStart(5, '0')}`;
  // Example: INV-2024-00042
}
```

---

## Line Item Types

| Type | Description | Example |
|------|-------------|---------|
| `subscription` | Base plan fee | Pro Plan - $199/mo |
| `usage` | Usage overage | 50K extra messages @ $0.001 |
| `one_time` | One-time charge | Setup fee |
| `credit` | Applied credit | Referral credit |
| `tax` | Tax amount | Sales Tax (8.25%) |

---

## Related Documents
- [Invoice System](../deepDive/billingPricing/invoice-system.md)
- [Billing Flow](./billing-flow.md)
