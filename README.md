# Brightloop — Subscription Management System

<p align="center">
  <strong>A Unified Modern React Platform for Subscription Management & Recurring Billing</strong>
</p>

## About Brightloop

**Brightloop Subscription Manager** is an enterprise subscription lifecycle and billing management platform originally designed for the **Odoo × FLUX Hackathon** and rebuilt as a high-performance modern React application.

It automates and centralizes business operations:
**Customer → Product & Variants → Plan → Subscription Lifecycle → Recurring Invoicing → Payment Matching → Financial Reporting → Customer Self-Service Portal**

---

## Key Modules & Features

### 1. Dashboard Overview
- Real-time KPIs: Total Customers, Monthly Recurring Revenue (MRR), Payments Received, and Outstanding Receivables.
- Subscription status breakdown pipeline (Active, Confirmed, Quotation, Draft, Paused, Closed).
- Recent invoices ledger with quick status tracking.
- One-click shortcuts for primary operational workflows.

### 2. Customer Management
- Register and maintain corporate accounts, individual accounts, contact emails, and phone numbers.
- Real-time instant search across customer names, emails, and company names.
- Client ID tagging and creation audit trail.

### 3. Product & Variant Catalog
- Define products with sales prices, cost prices, profit margins, and licensing types.
- Configurable SKU variants with item-specific extra pricing.

### 4. Subscription Plans
- Flexible billing cadences: Daily, Weekly, Monthly, and Yearly.
- Minimum order quantity enforcement.
- Configurable availability windows (From / Until).
- Fine-grained lifecycle policy toggles: Pausing allowed, Early cancellation allowed, Auto-renewal, and Expiry auto-closure.

### 5. Subscription Lifecycle
- Full status state machine:
  `Draft` → `Quotation` → `Confirmed` → `Active` ⇄ `Paused` → `Closed`
- Line items with product variants, quantities, and customizable tax rates.
- Contract renewal functionality extending subscriptions by 12 months.

### 6. Automated Periodic Billing Engine
- Detects unbilled periods according to plan cadence.
- Evaluates active promotional discount rules automatically.
- Generates itemized tax invoices with line subtotals, tax distributions, and discount savings.
- Prevents duplicate invoice issuance for already-billed periods.
- Full-screen printable Tax Invoice view with clean print styling.

### 7. Payment Transactions & Matching
- Record payments against confirmed outstanding invoices with real-time balance validation.
- Multiple settlement channels: Bank Transfer (ACH / NEFT), UPI, Card, Cash, and Other Gateways.
- Automated status progression to `Paid` once full invoice balance is collected.
- Payment performance indicators: Settled Collections, Pending Clearances, Failed Transactions.

### 8. Discount & Promotional Rules
- Percentage (%) or Fixed Amount ($) discounts.
- Minimum order value and minimum quantity requirements.
- Target entire subscription or restrict to a specific product SKU.
- Maximum discount cap ceilings and usage limits with redemption counters.
- Quick toggle for active/inactive status and safe deletion of unused codes.

### 9. Reports & Financial Analytics
- Annual Recurring Revenue (ARR) and Monthly Recurring Revenue (MRR) metrics.
- All-time collected revenue and uncollected receivables.
- 12-month revenue trajectory visualization.
- Subscription status distributions and payment method breakdown.

### 10. Customer Self-Service Portal
- Client portal allowing customers to view their active subscriptions and issued invoices.
- Self-service controls to pause, resume, or close contracts.
- Online payment simulation and printable tax invoice viewer.

---

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Persistence**: LocalStorage with demo data reset capability

---

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
