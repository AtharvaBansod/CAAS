# Subscriptions Schema

> **Collection**: `subscriptions`  
> **Database**: `caas_billing`  
> **Purpose**: Tracks SAAS client subscription status and billing cycles

---

## Overview

Subscriptions link SAAS clients to pricing plans and manage their billing lifecycle.

---

## Schema Definition

```javascript
// subscriptions collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  subscription_id: String,            // "sub_abc123xyz"
  
  // === REFERENCES ===
  client_id: ObjectId,                // Reference to saas_clients._id
  plan_id: ObjectId,                  // Reference to plans._id
  
  // === STATUS ===
  status: String,                     // 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused' | 'incomplete'
  
  // === BILLING CYCLE ===
  billing: {
    cycle: String,                    // 'monthly' | 'yearly'
    current_period_start: Date,
    current_period_end: Date,
    
    // Trial
    trial_start: Date,
    trial_end: Date,
    
    // Amounts
    base_amount: Number,              // Plan base price
    discount_amount: Number,          // Applied discounts
    tax_amount: Number,
    total_amount: Number,
    currency: String                  // 'USD'
  },
  
  // === PAYMENT ===
  payment: {
    method_id: ObjectId,              // Reference to payment_methods._id
    stripe_subscription_id: String,
    stripe_customer_id: String,
    
    last_payment_at: Date,
    last_payment_amount: Number,
    next_payment_at: Date,
    
    // Failed payment tracking
    failed_payment_count: Number,
    last_failed_at: Date,
    past_due_since: Date
  },
  
  // === DISCOUNTS ===
  discounts: [{
    coupon_id: String,
    coupon_code: String,
    discount_type: String,            // 'percent' | 'amount'
    discount_value: Number,
    applied_at: Date,
    expires_at: Date
  }],
  
  // === USAGE ADDONS ===
  addons: [{
    addon_id: String,
    name: String,                     // "Extra Storage", "Premium Support"
    quantity: Number,
    unit_price: Number,
    total_price: Number
  }],
  
  // === CANCELLATION ===
  cancellation: {
    cancelled_at: Date,
    cancel_at_period_end: Boolean,
    cancellation_reason: String,
    feedback: String,
    cancelled_by: ObjectId
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  activated_at: Date
}
```

---

## Status Values

| Status | Description |
|--------|-------------|
| `trialing` | In free trial period |
| `active` | Paying subscription |
| `past_due` | Payment failed, in grace period |
| `cancelled` | Subscription ended |
| `paused` | Temporarily paused |
| `incomplete` | Initial payment failed |

---

## Indexes

```javascript
db.subscriptions.createIndex({ "subscription_id": 1 }, { unique: true });
db.subscriptions.createIndex({ "client_id": 1 });
db.subscriptions.createIndex({ "status": 1 });
db.subscriptions.createIndex({ "payment.stripe_subscription_id": 1 });
db.subscriptions.createIndex({ "billing.current_period_end": 1 });
db.subscriptions.createIndex({ "payment.next_payment_at": 1 });
```

---

## Related Schemas

- [SAAS Clients](../platform/saas_clients.md) - Subscriber
- [Plans](plans.md) - Pricing plan
- [Invoices](invoices.md) - Generated invoices
- [Payment Methods](payment_methods.md) - Payment info
