# Plans Schema

> **Collection**: `plans`  
> **Database**: `caas_billing`  
> **Purpose**: Defines pricing tiers, features, and limits

---

## Overview

Plans define what each pricing tier includes - features, limits, and pricing.

---

## Schema Definition

```javascript
// plans collection
{
  _id: ObjectId,
  
  // === IDENTIFICATION ===
  plan_id: String,                    // "plan_pro_monthly"
  
  // === DISPLAY ===
  name: String,                       // "Professional"
  description: String,
  tier: String,                       // 'free' | 'starter' | 'pro' | 'enterprise'
  
  // === PRICING ===
  pricing: {
    monthly: {
      amount: Number,                 // 19900 (in cents)
      currency: String,               // 'USD'
      stripe_price_id: String
    },
    yearly: {
      amount: Number,                 // 199000 (in cents)
      currency: String,
      stripe_price_id: String,
      savings_percent: Number         // 17% savings
    }
  },
  
  // === LIMITS ===
  limits: {
    max_users: Number,                // -1 for unlimited
    max_messages_per_month: Number,
    max_storage_gb: Number,
    max_applications: Number,
    max_api_calls_per_month: Number,
    max_concurrent_connections: Number,
    max_group_size: Number,
    max_file_size_mb: Number
  },
  
  // === FEATURES ===
  features: {
    text_chat: Boolean,
    voice_calls: Boolean,
    video_calls: Boolean,
    screen_sharing: Boolean,
    file_sharing: Boolean,
    e2e_encryption: Boolean,
    custom_branding: Boolean,
    remove_powered_by: Boolean,
    sso: Boolean,
    webhooks: Boolean,
    advanced_analytics: Boolean,
    priority_support: Boolean,
    sla_guarantee: Boolean,
    dedicated_infrastructure: Boolean
  },
  
  // === OVERAGE PRICING ===
  overage: {
    per_extra_user: Number,           // Price per additional user
    per_1000_messages: Number,
    per_gb_storage: Number,
    per_1000_api_calls: Number
  },
  
  // === TRIAL ===
  trial: {
    enabled: Boolean,
    days: Number                      // 14 days
  },
  
  // === STATUS ===
  status: String,                     // 'active' | 'deprecated' | 'hidden'
  
  // === METADATA ===
  metadata: {
    display_order: Number,
    highlight: Boolean,               // "Most Popular" badge
    badge_text: String
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.plans.createIndex({ "plan_id": 1 }, { unique: true });
db.plans.createIndex({ "tier": 1, "status": 1 });
db.plans.createIndex({ "pricing.monthly.stripe_price_id": 1 });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440900"),
  plan_id: "plan_pro_v2",
  
  name: "Professional",
  description: "For growing teams with advanced collaboration needs",
  tier: "pro",
  
  pricing: {
    monthly: {
      amount: 19900,
      currency: "USD",
      stripe_price_id: "price_pro_monthly_v2"
    },
    yearly: {
      amount: 199000,
      currency: "USD",
      stripe_price_id: "price_pro_yearly_v2",
      savings_percent: 17
    }
  },
  
  limits: {
    max_users: 200,
    max_messages_per_month: 500000,
    max_storage_gb: 50,
    max_applications: 5,
    max_api_calls_per_month: 1000000,
    max_concurrent_connections: 500,
    max_group_size: 500,
    max_file_size_mb: 100
  },
  
  features: {
    text_chat: true,
    voice_calls: true,
    video_calls: true,
    screen_sharing: true,
    file_sharing: true,
    e2e_encryption: true,
    custom_branding: true,
    remove_powered_by: true,
    sso: false,
    webhooks: true,
    advanced_analytics: true,
    priority_support: true,
    sla_guarantee: false,
    dedicated_infrastructure: false
  },
  
  overage: {
    per_extra_user: 500,
    per_1000_messages: 100,
    per_gb_storage: 50,
    per_1000_api_calls: 10
  },
  
  trial: {
    enabled: true,
    days: 14
  },
  
  status: "active",
  
  metadata: {
    display_order: 3,
    highlight: true,
    badge_text: "Most Popular"
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

---

## Related Schemas

- [Subscriptions](subscriptions.md) - Client subscriptions
