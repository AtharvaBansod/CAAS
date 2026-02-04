# Billing & Pricing Service

> **Purpose**: Comprehensive billing platform managing subscriptions, usage tracking, payments, and pricing for SAAS clients.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Phase 1: Billing Foundation](#phase-1-billing-foundation)
- [Phase 2: Pricing Models](#phase-2-pricing-models)
- [Phase 3: Usage Metering](#phase-3-usage-metering)
- [Phase 4: Payment Integration](#phase-4-payment-integration)
- [Phase 5: Invoice & Reporting](#phase-5-invoice--reporting)
- [Phase 6: Enterprise Features](#phase-6-enterprise-features)
- [Related Resources](#related-resources)

---

## Overview

The Billing & Pricing Service handles:
- Subscription management for SAAS clients
- Usage-based billing calculations
- Payment processing and collection
- Invoice generation and delivery
- Revenue analytics and reporting

### Billing Architecture
```
                    ┌─────────────────┐
                    │  Client Portal  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼─────┐                 ┌─────▼─────┐
        │Subscription│                │   Usage   │
        │  Service   │                │  Metering │
        └─────┬─────┘                 └─────┬─────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │  Billing Engine │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
   ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
   │  Stripe   │       │  Invoice  │       │ Analytics │
   │ Integration│       │  Service  │       │  Service  │
   └───────────┘       └───────────┘       └───────────┘
```

---

## Phase 1: Billing Foundation

### 1.1 Billing Database Schema
```javascript
// subscriptions collection
{
  _id: ObjectId,
  client_id: ObjectId,
  plan_id: ObjectId,
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused',
  current_period: {
    start: Date,
    end: Date
  },
  billing_cycle: 'monthly' | 'yearly',
  payment_method_id: String,
  stripe_subscription_id: String,
  metadata: {
    trial_ends_at: Date,
    cancelled_at: Date,
    cancellation_reason: String
  },
  created_at: Date,
  updated_at: Date
}
```
- [ ] Subscription schema design
- [ ] Plan/pricing schema
- [ ] Usage records schema
- [ ] Invoice schema
- [ ] Payment history schema

### 1.2 Core Billing Service
- [ ] Subscription CRUD operations
- [ ] Plan management APIs
- [ ] Billing cycle management
- [ ] Proration calculations
- [ ] Subscription lifecycle events

**📁 Deep Dive**: [Billing Service Architecture](../deepDive/billingPricing/billing-architecture.md)

### 1.3 Multi-Currency Support
- [ ] Currency configuration
- [ ] Exchange rate management
- [ ] Currency conversion logic
- [ ] Display formatting
- [ ] Regional pricing

### 1.4 Tax Management
- [ ] Tax rate configuration
- [ ] Tax exemptions
- [ ] VAT/GST handling
- [ ] Tax calculation service
- [ ] Tax reporting

**🔬 R&D**: [Global Tax Compliance](../rnd/global-tax-compliance.md)

---

## Phase 2: Pricing Models

### 2.1 Plan Structure
```typescript
interface PricingPlan {
  id: string;
  name: string;                    // Starter, Professional, Enterprise
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  billing_schemes: {
    monthly: {
      price: number;
      currency: string;
    };
    yearly: {
      price: number;
      discount_percent: number;
    };
  };
  features: {
    max_users: number;             // -1 for unlimited
    max_messages: number;
    max_storage_gb: number;
    features: string[];            // ['voice_calls', 'video_calls', 'screen_share']
  };
  usage_limits: {
    api_calls_per_month: number;
    concurrent_connections: number;
  };
  overage: {
    per_extra_user: number;
    per_1000_messages: number;
    per_gb_storage: number;
  };
}
```
- [ ] Plan tier definitions
- [ ] Feature matrix
- [ ] Usage limits per plan
- [ ] Overage pricing
- [ ] Plan comparison page data

**📊 Flow Diagram**: [Pricing Model Structure](../flowdiagram/pricing-model.md)

### 2.2 Pricing Strategies
| Model | Description | Use Case |
|-------|-------------|----------|
| Flat Rate | Fixed monthly fee | Small/starter plans |
| Per-User | Price × active users | Team-based pricing |
| Usage-Based | Pay per message/API call | High-volume clients |
| Tiered | Graduated pricing | Growing businesses |
| Hybrid | Base fee + usage | Enterprise clients |

- [ ] Flat rate implementation
- [ ] Per-seat pricing
- [ ] Usage-based pricing
- [ ] Tiered pricing
- [ ] Custom enterprise pricing

### 2.3 Discounts & Promotions
- [ ] Coupon code system
- [ ] Volume discounts
- [ ] Annual payment discounts
- [ ] Referral credits
- [ ] Promotional campaigns

### 2.4 Free Tier & Trials
- [ ] Free plan limits
- [ ] Trial period management
- [ ] Trial-to-paid conversion
- [ ] Trial extension logic
- [ ] Feature gating for trials

**📁 Deep Dive**: [Pricing Strategy Implementation](../deepDive/billingPricing/pricing-strategy.md)

---

## Phase 3: Usage Metering

### 3.1 Usage Event Collection
```typescript
// Usage event from Kafka
interface UsageEvent {
  event_type: 'message_sent' | 'api_call' | 'file_upload' | 'call_minute';
  tenant_id: string;
  user_id: string;
  timestamp: number;
  metadata: {
    quantity: number;
    unit: string;
    details: Record<string, any>;
  };
}
```
- [ ] Usage event ingestion
- [ ] Event deduplication
- [ ] Real-time aggregation
- [ ] Event validation
- [ ] Late event handling

### 3.2 Metering Dimensions
| Dimension | Unit | Tracking |
|-----------|------|----------|
| Messages | count | Per tenant, per day |
| Active Users | unique users | Monthly |
| API Calls | count | Per hour, per endpoint |
| Storage | GB | Current total |
| Call Minutes | minutes | Per conversation |
| Bandwidth | GB | Monthly |

- [ ] Message counting
- [ ] MAU/DAU tracking
- [ ] API call metering
- [ ] Storage calculation
- [ ] Voice/video minutes

**📊 Flow Diagram**: [Usage Metering Pipeline](../flowdiagram/usage-metering.md)

### 3.3 Usage Storage
```sql
-- TimescaleDB hypertable
CREATE TABLE usage_metrics (
  time TIMESTAMPTZ NOT NULL,
  tenant_id TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value BIGINT NOT NULL,
  dimensions JSONB
);

SELECT create_hypertable('usage_metrics', 'time');
```
- [ ] Time-series storage
- [ ] Aggregation queries
- [ ] Rollup jobs
- [ ] Data retention
- [ ] Query optimization

### 3.4 Usage Reporting
- [ ] Real-time usage dashboard
- [ ] Usage alerts (80%, 90%, 100%)
- [ ] Usage forecasting
- [ ] Usage export API
- [ ] Historical trends

**📁 Deep Dive**: [Usage Metering System](../deepDive/billingPricing/usage-metering.md)

---

## Phase 4: Payment Integration

### 4.1 Stripe Integration
```typescript
// Stripe setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create subscription
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: stripePriceId }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});

// Handle webhooks
app.post('/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    webhookSecret
  );
  
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
});
```
- [ ] Stripe account setup
- [ ] Customer management
- [ ] Payment method handling
- [ ] Subscription synchronization
- [ ] Webhook handling

### 4.2 Payment Methods
- [ ] Credit/debit cards
- [ ] ACH bank transfers
- [ ] Wire transfers (enterprise)
- [ ] PayPal (optional)
- [ ] Regional payment methods

### 4.3 Payment Lifecycle
- [ ] Payment creation
- [ ] Payment confirmation
- [ ] Payment failure handling
- [ ] Retry logic
- [ ] Dunning management

**📊 Flow Diagram**: [Payment Processing Flow](../flowdiagram/payment-flow.md)

### 4.4 Failed Payment Recovery
```
[Payment Failed]
      ↓
[Retry Attempt 1] → Day 1
      ↓
[Retry Attempt 2] → Day 3
      ↓
[Retry Attempt 3] → Day 7
      ↓
[Account Delinquent] → Day 14
      ↓
[Account Suspended] → Day 30
```
- [ ] Smart retry scheduling
- [ ] Failed payment notifications
- [ ] Grace period management
- [ ] Account degradation
- [ ] Recovery incentives

**📁 Deep Dive**: [Payment Integration](../deepDive/billingPricing/payment-integration.md)

---

## Phase 5: Invoice & Reporting

### 5.1 Invoice Generation
```typescript
interface Invoice {
  id: string;
  invoice_number: string;         // INV-2024-00001
  client_id: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'void';
  period: {
    start: Date;
    end: Date;
  };
  line_items: [{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    type: 'subscription' | 'overage' | 'credit';
  }];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  due_date: Date;
  paid_at: Date | null;
  pdf_url: string;
}
```
- [ ] Invoice creation workflow
- [ ] Line item calculations
- [ ] Tax calculations
- [ ] PDF generation
- [ ] Invoice numbering

### 5.2 Invoice Delivery
- [ ] Email delivery
- [ ] Client portal access
- [ ] Invoice history
- [ ] Download options
- [ ] Invoice reminders

### 5.3 Credits & Refunds
- [ ] Credit note generation
- [ ] Refund processing
- [ ] Credit balance tracking
- [ ] Automatic credit application
- [ ] Pro-rata refunds

### 5.4 Revenue Reporting
| Report | Metrics |
|--------|---------|
| MRR/ARR | Monthly/Annual recurring revenue |
| Churn | Customer and revenue churn |
| LTV | Customer lifetime value |
| CAC | Customer acquisition cost |
| Net Revenue | Gross - refunds - credits |

- [ ] Revenue dashboards
- [ ] Churn analysis
- [ ] Cohort revenue analysis
- [ ] Revenue forecasting
- [ ] Financial exports

**📁 Deep Dive**: [Invoice System](../deepDive/billingPricing/invoice-system.md)

---

## Phase 6: Enterprise Features

### 6.1 Enterprise Billing
- [ ] Custom contracts
- [ ] Negotiated pricing
- [ ] Multi-year agreements
- [ ] Volume commitments
- [ ] Custom payment terms

### 6.2 Invoice Purchase Orders
- [ ] PO number tracking
- [ ] PO-based invoicing
- [ ] PO approval workflow
- [ ] Enterprise procurement integration

### 6.3 Multi-Entity Billing
```
Parent Company
├── Subsidiary A
│   ├── Application 1 (billed separately)
│   └── Application 2 (consolidated)
└── Subsidiary B
    └── Application 3 (billed to parent)
```
- [ ] Hierarchical accounts
- [ ] Consolidated billing
- [ ] Separate billing per entity
- [ ] Cost allocation

### 6.4 Marketplace Integration
- [ ] AWS Marketplace listing
- [ ] Azure Marketplace listing
- [ ] GCP Marketplace listing
- [ ] Marketplace billing sync

**🔬 R&D**: [Cloud Marketplace Integration](../rnd/marketplace-integration.md)

### 6.5 Compliance & Audit
- [ ] SOC 2 billing controls
- [ ] Billing audit logs
- [ ] Financial compliance
- [ ] Revenue recognition (ASC 606)
- [ ] Data export for auditors

---

## Related Resources

### Deep Dive Documents
- [Billing Architecture](../deepDive/billingPricing/billing-architecture.md)
- [Pricing Strategy](../deepDive/billingPricing/pricing-strategy.md)
- [Usage Metering](../deepDive/billingPricing/usage-metering.md)
- [Payment Integration](../deepDive/billingPricing/payment-integration.md)
- [Invoice System](../deepDive/billingPricing/invoice-system.md)

### R&D Documents
- [Global Tax Compliance](../rnd/global-tax-compliance.md)
- [Cloud Marketplace Integration](../rnd/marketplace-integration.md)
- [Billing System Comparison](../rnd/billing-system-comparison.md)

### Flow Diagrams
- [Pricing Model Structure](../flowdiagram/pricing-model.md)
- [Usage Metering Pipeline](../flowdiagram/usage-metering.md)
- [Payment Processing Flow](../flowdiagram/payment-flow.md)
- [Invoice Generation Flow](../flowdiagram/invoice-generation.md)

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Payment Provider | Stripe |
| Usage Metering | Custom + TimescaleDB |
| Invoice PDF | Puppeteer / WeasyPrint |
| Tax Calculation | Stripe Tax / TaxJar |
| Analytics | ClickHouse |

---

## Pricing Tiers

| Plan | Monthly | Users | Messages | Storage | Features |
|------|---------|-------|----------|---------|----------|
| Free | $0 | 10 | 10K | 1GB | Basic chat |
| Starter | $49 | 50 | 100K | 10GB | + Voice |
| Pro | $199 | 200 | 500K | 50GB | + Video, Screen share |
| Enterprise | Custom | Unlimited | Unlimited | Custom | All features + SLA |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Payment Success Rate | > 98% |
| Invoice Delivery | < 1 hour |
| Usage Calculation Delay | < 5 minutes |
| Revenue Recognition Accuracy | 100% |
| Dunning Recovery Rate | > 40% |
