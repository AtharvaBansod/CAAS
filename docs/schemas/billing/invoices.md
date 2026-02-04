# Invoices Schema

> **Collection**: `invoices`  
> **Database**: `caas_billing`  
> **Purpose**: Stores generated invoices for billing periods

---

## Schema Definition

```javascript
// invoices collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  invoice_id: String,                 // "inv_abc123xyz"
  invoice_number: String,             // "INV-2024-00001"
  
  // === REFERENCES ===
  client_id: ObjectId,
  subscription_id: ObjectId,
  
  // === STATUS ===
  status: String,                     // 'draft' | 'pending' | 'paid' | 'overdue' | 'void' | 'refunded'
  
  // === PERIOD ===
  period: {
    start: Date,
    end: Date
  },
  
  // === LINE ITEMS ===
  line_items: [{
    item_id: String,
    description: String,              // "Pro Plan - Monthly"
    type: String,                     // 'subscription' | 'overage' | 'addon' | 'credit'
    quantity: Number,
    unit_price: Number,               // In cents
    amount: Number,                   // Total in cents
    tax_rate: Number,
    tax_amount: Number
  }],
  
  // === TOTALS ===
  totals: {
    subtotal: Number,
    tax: Number,
    discount: Number,
    credits_applied: Number,
    total: Number,
    amount_due: Number,
    amount_paid: Number,
    currency: String
  },
  
  // === PAYMENT ===
  payment: {
    due_date: Date,
    paid_at: Date,
    payment_method: String,
    stripe_invoice_id: String,
    stripe_payment_intent_id: String,
    receipt_url: String
  },
  
  // === PDF ===
  pdf: {
    url: String,
    generated_at: Date
  },
  
  // === REFUND ===
  refund: {
    refunded_at: Date,
    refund_amount: Number,
    reason: String,
    stripe_refund_id: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  finalized_at: Date
}
```

---

## Indexes

```javascript
db.invoices.createIndex({ "invoice_id": 1 }, { unique: true });
db.invoices.createIndex({ "invoice_number": 1 }, { unique: true });
db.invoices.createIndex({ "client_id": 1, "created_at": -1 });
db.invoices.createIndex({ "status": 1, "payment.due_date": 1 });
db.invoices.createIndex({ "payment.stripe_invoice_id": 1 });
```

---

## Related Schemas

- [Subscriptions](subscriptions.md) - Source subscription
- [SAAS Clients](../platform/saas_clients.md) - Billed client
