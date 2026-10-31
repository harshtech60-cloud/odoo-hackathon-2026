import {
  BillingFrequency,
  Discount,
  Invoice,
  InvoiceLine,
  Subscription,
  DueSubscriptionInfo,
} from '../types';

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(startDate: Date, months: number): Date {
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + months;
  const day = startDate.getDate();

  const targetDate = new Date(year, month, 1);
  const maxDaysInTargetMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    0
  ).getDate();

  return new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    Math.min(day, maxDaysInTargetMonth)
  );
}

export function getPeriodEnd(startDate: Date, frequency: BillingFrequency): Date {
  let nextDate: Date;

  if (frequency === 'daily') {
    nextDate = addDays(startDate, 1);
  } else if (frequency === 'weekly') {
    nextDate = addDays(startDate, 7);
  } else if (frequency === 'monthly') {
    nextDate = addMonths(startDate, 1);
  } else if (frequency === 'yearly') {
    nextDate = addMonths(startDate, 12);
  } else {
    nextDate = addMonths(startDate, 1);
  }

  return addDays(nextDate, -1);
}

export function getNextBillingDate(
  subscription: Subscription,
  invoices: Invoice[]
): Date {
  const subInvoices = invoices
    .filter((inv) => inv.subscriptionId === subscription.id)
    .sort((a, b) => b.billingPeriodEnd.localeCompare(a.billingPeriodEnd));

  if (subInvoices.length > 0) {
    const lastEnd = parseDate(subInvoices[0].billingPeriodEnd);
    return addDays(lastEnd, 1);
  }

  return parseDate(subscription.startDate);
}

export function findDueSubscriptions(
  subscriptions: Subscription[],
  invoices: Invoice[],
  today: Date
): DueSubscriptionInfo[] {
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const dueList: DueSubscriptionInfo[] = [];

  for (const sub of activeSubs) {
    const nextDate = getNextBillingDate(sub, invoices);
    const expiryDate = parseDate(sub.expiryDate);

    if (nextDate <= today && nextDate <= expiryDate) {
      dueList.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerName: sub.customerName,
        planName: sub.planName,
        nextDueDate: formatDate(nextDate),
      });
    }
  }

  return dueList;
}

interface ItemForDiscount {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  productId?: number | null;
}

export function calculateDiscountAmount(
  discount: Discount,
  items: ItemForDiscount[]
): number {
  const eligible =
    discount.productId == null
      ? items
      : items.filter((item) => item.productId === discount.productId);

  const base = Number(
    eligible.reduce((acc, item) => acc + item.lineSubtotal, 0).toFixed(2)
  );

  const quantity = eligible.reduce((acc, item) => {
    return item.productId != null ? acc + item.quantity : acc;
  }, 0);

  if (base <= 0) return 0.0;
  if (base < (discount.minOrderValue || 0)) return 0.0;
  if (quantity < (discount.minQuantity || 0)) return 0.0;

  let amount = 0.0;
  if (discount.discountType === 'Percentage') {
    amount = (base * discount.discountValue) / 100;
  } else {
    amount = discount.discountValue;
  }

  if (discount.maxDiscountAmount != null) {
    amount = Math.min(amount, discount.maxDiscountAmount);
  }

  return Number(Math.min(amount, base).toFixed(2));
}

export function findBestDiscount(
  discounts: Discount[],
  items: ItemForDiscount[],
  invoiceDateStr: string
): { bestDiscount: Discount | null; bestAmount: number } {
  const candidates = discounts.filter(
    (d) =>
      d.status === 'Active' &&
      d.startDate <= invoiceDateStr &&
      d.endDate >= invoiceDateStr &&
      (d.usageLimit == null || d.usedCount < d.usageLimit)
  );

  let best: Discount | null = null;
  let bestAmount = 0.0;

  for (const disc of candidates) {
    const amt = calculateDiscountAmount(disc, items);
    if (amt > bestAmount) {
      best = disc;
      bestAmount = amt;
    }
  }

  return { bestDiscount: best, bestAmount };
}

export function applyDiscountToItems(
  items: ItemForDiscount[],
  discount: Discount | null,
  amount: number
): void {
  const eligible =
    discount && discount.productId != null
      ? items.filter((item) => item.productId === discount.productId)
      : discount
      ? [...items]
      : [];

  const base = eligible.reduce((acc, item) => acc + item.lineSubtotal, 0);

  for (const item of items) {
    item.discountAmount = 0.0;
  }

  let remaining = amount;
  eligible.forEach((item, index) => {
    let share = 0;
    if (index === eligible.length - 1) {
      share = Number(remaining.toFixed(2));
    } else {
      share = Number(((amount * item.lineSubtotal) / (base || 1)).toFixed(2));
      remaining -= share;
    }
    item.discountAmount = share;
  });

  for (const item of items) {
    const taxable = item.lineSubtotal - (item.discountAmount || 0);
    item.taxAmount = Number(((taxable * item.taxRate) / 100).toFixed(2));
  }
}

export interface BillingGenerationResult {
  createdCount: number;
  newInvoices: Invoice[];
  updatedDiscounts: Discount[];
}

export function generateDueInvoicesEngine(
  subscriptions: Subscription[],
  existingInvoices: Invoice[],
  discounts: Discount[],
  today: Date
): BillingGenerationResult {
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const allInvoices = [...existingInvoices];
  const allDiscounts = [...discounts];
  const generated: Invoice[] = [];

  let nextInvoiceId =
    allInvoices.reduce((max, inv) => Math.max(max, inv.id), 0) + 1;
  let nextLineId = 1000;

  for (const sub of activeSubs) {
    const expiryDate = parseDate(sub.expiryDate);

    while (true) {
      const periodStart = getNextBillingDate(sub, allInvoices);

      if (periodStart > today || periodStart > expiryDate) {
        break;
      }

      let periodEnd = getPeriodEnd(periodStart, sub.billingFrequency);
      if (periodEnd > expiryDate) {
        periodEnd = expiryDate;
      }

      const periodStartText = formatDate(periodStart);
      const periodEndText = formatDate(periodEnd);

      const existing = allInvoices.find(
        (inv) =>
          inv.subscriptionId === sub.id &&
          inv.billingPeriodStart === periodStartText
      );

      if (existing) {
        break;
      }

      const invoiceItems: ItemForDiscount[] = [];
      const planTaxRate = sub.lines.length > 0 ? sub.lines[0].taxRate : 18;
      const planTax = Number(((sub.planPrice * planTaxRate) / 100).toFixed(2));

      invoiceItems.push({
        description: `${sub.planName} (${sub.billingFrequency} plan fee)`,
        quantity: 1,
        unitPrice: sub.planPrice,
        taxRate: planTaxRate,
        lineSubtotal: sub.planPrice,
        taxAmount: planTax,
        productId: null,
      });

      for (const line of sub.lines) {
        const lineTax = Number(
          ((line.lineSubtotal * line.taxRate) / 100).toFixed(2)
        );
        let desc = line.productName;
        if (line.variantName) {
          desc += ` - ${line.variantName}`;
        }

        invoiceItems.push({
          description: desc,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineSubtotal: line.lineSubtotal,
          taxAmount: lineTax,
          productId: line.productId,
        });
      }

      const invoiceDateText = periodStartText;
      const { bestDiscount, bestAmount } = findBestDiscount(
        allDiscounts,
        invoiceItems,
        invoiceDateText
      );

      let effectiveDiscount = bestDiscount;
      let effectiveDiscountAmount = bestAmount;

      if (effectiveDiscount) {
        const discIndex = allDiscounts.findIndex(
          (d) => d.id === effectiveDiscount!.id
        );
        if (discIndex >= 0) {
          const disc = allDiscounts[discIndex];
          if (disc.usageLimit == null || disc.usedCount < disc.usageLimit) {
            allDiscounts[discIndex] = {
              ...disc,
              usedCount: disc.usedCount + 1,
            };
          } else {
            effectiveDiscount = null;
            effectiveDiscountAmount = 0.0;
          }
        }
      }

      applyDiscountToItems(
        invoiceItems,
        effectiveDiscount,
        effectiveDiscountAmount
      );

      const subtotal = Number(
        invoiceItems.reduce((acc, it) => acc + it.lineSubtotal, 0).toFixed(2)
      );
      const taxAmount = Number(
        invoiceItems.reduce((acc, it) => acc + (it.taxAmount || 0), 0).toFixed(2)
      );
      const totalAmount = Number(
        (subtotal - effectiveDiscountAmount + taxAmount).toFixed(2)
      );

      const dueDate = addDays(periodStart, sub.paymentTermsDays);
      const invoiceNumber = `INV-${String(nextInvoiceId).padStart(5, '0')}`;

      const lines: InvoiceLine[] = invoiceItems.map((it) => ({
        id: nextLineId++,
        invoiceId: nextInvoiceId,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        lineSubtotal: it.lineSubtotal,
        discountAmount: it.discountAmount || 0,
        taxAmount: it.taxAmount || 0,
        lineTotal: Number(
          (
            it.lineSubtotal -
            (it.discountAmount || 0) +
            (it.taxAmount || 0)
          ).toFixed(2)
        ),
        productId: it.productId ?? undefined,
      }));

      const newInvoice: Invoice = {
        id: nextInvoiceId++,
        invoiceNumber,
        subscriptionId: sub.id,
        subscriptionNumber: sub.subscriptionNumber,
        customerId: sub.customerId,
        customerName: sub.customerName,
        customerEmail: sub.customerEmail,
        billingPeriodStart: periodStartText,
        billingPeriodEnd: periodEndText,
        invoiceDate: invoiceDateText,
        dueDate: formatDate(dueDate),
        subtotal,
        discountAmount: effectiveDiscountAmount,
        discountCode: effectiveDiscount ? effectiveDiscount.code : undefined,
        taxAmount,
        totalAmount,
        status: 'Draft',
        createdAt: new Date().toISOString(),
        lines,
      };

      generated.push(newInvoice);
      allInvoices.push(newInvoice);
    }
  }

  return {
    createdCount: generated.length,
    newInvoices: generated,
    updatedDiscounts: allDiscounts,
  };
}
