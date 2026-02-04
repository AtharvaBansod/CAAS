# Billing & Pricing - Payment Integration

> **Parent Roadmap**: [Billing & Pricing](../../roadmaps/10_billingPricing.md)

---

## Overview

Stripe integration for payment processing, subscriptions, and invoicing.

---

## 1. Stripe Setup

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true
});

// Create customer on signup
async function createStripeCustomer(client: Client): Promise<string> {
  const customer = await stripe.customers.create({
    email: client.email,
    name: client.companyName,
    metadata: {
      caas_client_id: client.id,
      caas_tenant_id: client.tenantId
    }
  });
  
  return customer.id;
}
```

---

## 2. Subscription Management

```typescript
// Create subscription
async function createSubscription(
  customerId: string, 
  priceId: string,
  options?: SubscriptionOptions
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: options?.trialDays || 14,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      caas_plan: options?.planName
    }
  });
  
  return subscription;
}

// Upgrade/Downgrade
async function changePlan(
  subscriptionId: string, 
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId
    }],
    proration_behavior: 'create_prorations'
  });
}

// Cancel subscription
async function cancelSubscription(
  subscriptionId: string, 
  immediate = false
): Promise<Stripe.Subscription> {
  if (immediate) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
}
```

---

## 3. Payment Methods

```typescript
// Create SetupIntent for adding payment method
async function createSetupIntent(customerId: string): Promise<string> {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session'
  });
  
  return setupIntent.client_secret!;
}

// List customer payment methods
async function getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card'
  });
  
  return methods.data.map(m => ({
    id: m.id,
    brand: m.card!.brand,
    last4: m.card!.last4,
    expMonth: m.card!.exp_month,
    expYear: m.card!.exp_year,
    isDefault: m.id === m.customer?.invoice_settings?.default_payment_method
  }));
}

// Set default payment method
async function setDefaultPaymentMethod(
  customerId: string, 
  paymentMethodId: string
): Promise<void> {
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId
    }
  });
}
```

---

## 4. Webhook Handling

```typescript
// Webhook endpoint
router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle event
  await handleStripeEvent(event);
  
  res.json({ received: true });
});

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const clientId = invoice.metadata?.caas_client_id;
  
  await db.invoices.updateOne(
    { stripeInvoiceId: invoice.id },
    { 
      $set: { 
        status: 'paid',
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000)
      }
    }
  );
  
  await updateSubscriptionStatus(invoice.subscription as string, 'active');
  await sendReceiptEmail(clientId, invoice);
}
```

---

## 5. Usage-Based Billing

```typescript
// Report usage to Stripe
async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  timestamp: Date
): Promise<void> {
  await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: Math.floor(timestamp.getTime() / 1000),
      action: 'increment'
    }
  );
}

// End of period usage sync
async function syncMonthlyUsage(tenantId: string): Promise<void> {
  const usage = await getMonthlyUsage(tenantId);
  const subscription = await getSubscription(tenantId);
  
  // Find usage-based items
  const messageItem = subscription.items.find(i => i.price.lookup_key === 'messages');
  
  if (messageItem && usage.messages > subscription.plan.includedMessages) {
    const overage = usage.messages - subscription.plan.includedMessages;
    await reportUsage(messageItem.id, overage, new Date());
  }
}
```

---

## 6. Invoice Customization

```typescript
// Add custom line items before invoice finalization
stripe.invoices.retrieve(invoiceId).then(async (invoice) => {
  if (invoice.status === 'draft') {
    // Add usage overage
    await stripe.invoiceItems.create({
      customer: invoice.customer as string,
      invoice: invoice.id,
      amount: calculateOverageAmount(tenantId),
      currency: 'usd',
      description: 'Message overage (50,000 messages @ $0.001/msg)'
    });
  }
});
```

---

## Related Documents
- [Billing Architecture](./billing-architecture.md)
- [Payment Flow](../../flowdiagram/payment-flow.md)
