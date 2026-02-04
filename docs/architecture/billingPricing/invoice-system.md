# Billing & Pricing - Invoice System

> **Parent Roadmap**: [Billing & Pricing](../../roadmaps/10_billingPricing.md)

---

## Overview

Invoice generation, PDF rendering, and delivery system.

---

## 1. Invoice Schema

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;      // INV-2024-00001
  tenantId: string;
  clientId: string;
  stripeInvoiceId: string;
  
  // Billing period
  periodStart: Date;
  periodEnd: Date;
  
  // Status
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  
  // Line items
  lineItems: LineItem[];
  
  // Amounts
  subtotal: number;
  discounts: Discount[];
  tax: TaxAmount;
  total: number;
  amountPaid: number;
  amountDue: number;
  
  // Dates
  createdAt: Date;
  dueDate: Date;
  paidAt?: Date;
  
  // Files
  pdfUrl?: string;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'subscription' | 'usage' | 'one_time' | 'credit';
}
```

---

## 2. Invoice Generation

```typescript
class InvoiceService {
  async generateMonthlyInvoice(tenantId: string): Promise<Invoice> {
    const subscription = await getSubscription(tenantId);
    const usage = await getMonthlyUsage(tenantId);
    const client = await getClient(tenantId);
    
    // Build line items
    const lineItems: LineItem[] = [];
    
    // Base subscription
    lineItems.push({
      id: generateId(),
      description: `${subscription.plan.name} Plan - Monthly`,
      quantity: 1,
      unitPrice: subscription.plan.price,
      amount: subscription.plan.price,
      type: 'subscription'
    });
    
    // Usage overages
    const overages = calculateOverages(subscription.plan, usage);
    for (const overage of overages) {
      lineItems.push({
        id: generateId(),
        description: overage.description,
        quantity: overage.quantity,
        unitPrice: overage.unitPrice,
        amount: overage.amount,
        type: 'usage'
      });
    }
    
    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = await calculateTax(client.address, subtotal);
    const total = subtotal + tax.amount;
    
    // Create invoice
    const invoice: Invoice = {
      id: generateId(),
      invoiceNumber: await generateInvoiceNumber(tenantId),
      tenantId,
      clientId: client.id,
      status: 'draft',
      periodStart: startOfMonth(new Date()),
      periodEnd: endOfMonth(new Date()),
      lineItems,
      subtotal,
      discounts: [],
      tax,
      total,
      amountPaid: 0,
      amountDue: total,
      createdAt: new Date(),
      dueDate: addDays(new Date(), 30)
    };
    
    await db.invoices.insertOne(invoice);
    
    return invoice;
  }
}
```

---

## 3. PDF Generation

```typescript
import PDFDocument from 'pdfkit';

class InvoicePDFGenerator {
  async generate(invoice: Invoice): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    // Header
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${format(invoice.createdAt, 'PP')}`);
    doc.text(`Due Date: ${format(invoice.dueDate, 'PP')}`);
    
    doc.moveDown();
    
    // Bill To
    const client = await getClient(invoice.clientId);
    doc.fontSize(12).text('Bill To:');
    doc.fontSize(10).text(client.companyName);
    doc.text(client.address.line1);
    doc.text(`${client.address.city}, ${client.address.state} ${client.address.postal}`);
    
    doc.moveDown(2);
    
    // Line Items Table
    this.drawLineItems(doc, invoice.lineItems);
    
    doc.moveDown();
    
    // Totals
    doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, { align: 'right' });
    doc.text(`Tax: ${formatCurrency(invoice.tax.amount)}`, { align: 'right' });
    doc.fontSize(14).text(`Total: ${formatCurrency(invoice.total)}`, { align: 'right' });
    
    doc.end();
    
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }
  
  private drawLineItems(doc: PDFDocument, items: LineItem[]): void {
    const tableTop = doc.y;
    
    // Header
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Unit Price', 370, tableTop);
    doc.text('Amount', 470, tableTop);
    
    doc.font('Helvetica');
    let y = tableTop + 20;
    
    for (const item of items) {
      doc.text(item.description, 50, y);
      doc.text(item.quantity.toString(), 300, y);
      doc.text(formatCurrency(item.unitPrice), 370, y);
      doc.text(formatCurrency(item.amount), 470, y);
      y += 20;
    }
  }
}
```

---

## 4. Invoice Delivery

```typescript
class InvoiceDeliveryService {
  async deliver(invoice: Invoice): Promise<void> {
    const client = await getClient(invoice.clientId);
    
    // Generate PDF
    const pdf = await this.pdfGenerator.generate(invoice);
    
    // Upload to S3
    const pdfUrl = await this.storage.upload(
      `invoices/${invoice.tenantId}/${invoice.id}.pdf`,
      pdf,
      'application/pdf'
    );
    
    // Update invoice with PDF URL
    await db.invoices.updateOne(
      { id: invoice.id },
      { $set: { pdfUrl } }
    );
    
    // Send email
    await this.emailService.send({
      to: client.billingEmail,
      template: 'invoice',
      data: {
        invoiceNumber: invoice.invoiceNumber,
        total: formatCurrency(invoice.total),
        dueDate: format(invoice.dueDate, 'PP'),
        viewUrl: `${DASHBOARD_URL}/invoices/${invoice.id}`,
        pdfUrl
      },
      attachments: [{
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdf
      }]
    });
  }
}
```

---

## 5. Invoice API

```typescript
// GET /api/invoices
router.get('/invoices', async (req, res) => {
  const invoices = await db.invoices.find({
    tenantId: req.tenantId
  }).sort({ createdAt: -1 }).toArray();
  
  res.json(invoices);
});

// GET /api/invoices/:id/pdf
router.get('/invoices/:id/pdf', async (req, res) => {
  const invoice = await db.invoices.findOne({ id: req.params.id });
  
  if (invoice.pdfUrl) {
    return res.redirect(invoice.pdfUrl);
  }
  
  // Generate on-demand
  const pdf = await pdfGenerator.generate(invoice);
  res.contentType('application/pdf');
  res.send(pdf);
});
```

---

## Related Documents
- [Billing Architecture](./billing-architecture.md)
- [Payment Integration](./payment-integration.md)
