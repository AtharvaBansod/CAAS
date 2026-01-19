# Payment Methods Schema

> **Collection**: `payment_methods`  
> **Database**: `caas_billing`  
> **Purpose**: Stores saved payment methods for SAAS clients

---

## Schema Definition

```javascript
// payment_methods collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  payment_method_id: String,          // "pm_abc123xyz"
  
  // === OWNER ===
  client_id: ObjectId,
  
  // === TYPE ===
  type: String,                       // 'card' | 'bank_account' | 'paypal'
  
  // === CARD DETAILS (if type = card) ===
  card: {
    brand: String,                    // 'visa' | 'mastercard' | 'amex'
    last4: String,                    // "4242"
    exp_month: Number,
    exp_year: Number,
    funding: String,                  // 'credit' | 'debit'
    country: String
  },
  
  // === BANK ACCOUNT (if type = bank_account) ===
  bank_account: {
    bank_name: String,
    last4: String,
    routing_number_last4: String,
    account_type: String              // 'checking' | 'savings'
  },
  
  // === STRIPE ===
  stripe: {
    payment_method_id: String,
    customer_id: String,
    fingerprint: String               // For detecting duplicates
  },
  
  // === BILLING ADDRESS ===
  billing_address: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal_code: String,
    country: String
  },
  
  // === STATUS ===
  is_default: Boolean,
  status: String,                     // 'active' | 'expired' | 'removed'
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  removed_at: Date
}
```

---

## Indexes

```javascript
db.payment_methods.createIndex({ "payment_method_id": 1 }, { unique: true });
db.payment_methods.createIndex({ "client_id": 1, "status": 1 });
db.payment_methods.createIndex({ "stripe.payment_method_id": 1 });
db.payment_methods.createIndex({ "stripe.fingerprint": 1 });
```

---

## Related Schemas

- [SAAS Clients](../platform/saas_clients.md) - Owner
- [Subscriptions](subscriptions.md) - Uses payment method
