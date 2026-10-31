export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  customerId?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  phone: string;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  variantName: string;
  extraPrice: number;
}

export interface Product {
  id: number;
  name: string;
  productType: string;
  salesPrice: number;
  costPrice: number;
  notes: string;
  createdAt: string;
  variants: ProductVariant[];
}

export type BillingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  billingFrequency: BillingFrequency;
  minimumQuantity: number;
  availableFrom: string;
  availableUntil?: string;
  autoClose: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  createdAt: string;
}

export type SubscriptionStatus =
  | 'Draft'
  | 'Quotation'
  | 'Confirmed'
  | 'Active'
  | 'Paused'
  | 'Closed';

export interface SubscriptionLine {
  id: number;
  subscriptionId: number;
  productId: number;
  variantId?: number;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
}

export interface Subscription {
  id: number;
  subscriptionNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  planId: number;
  planName: string;
  billingFrequency: BillingFrequency;
  startDate: string;
  expiryDate: string;
  paymentTermsDays: number;
  status: SubscriptionStatus;
  planPrice: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  quotationValidUntil?: string;
  createdAt: string;
  lines: SubscriptionLine[];
  allowPause?: boolean;
  allowEarlyClose?: boolean;
  allowRenewal?: boolean;
}

export type InvoiceStatus = 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';

export interface InvoiceLine {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  productId?: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  subscriptionId: number;
  subscriptionNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  customerPhone?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  discountCode?: string;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  sentAt?: string;
  createdAt: string;
  lines: InvoiceLine[];
}

export type PaymentMethod = 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Other';
export type PaymentStatus = 'Completed' | 'Pending' | 'Failed' | 'Refunded';

export interface Payment {
  id: number;
  paymentNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  status: PaymentStatus;
  createdAt: string;
}

export type DiscountType = 'Percentage' | 'Fixed Amount';
export type DiscountStatus = 'Active' | 'Inactive';

export interface Discount {
  id: number;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usedCount: number;
  minQuantity: number;
  productId?: number;
  status: DiscountStatus;
  createdAt: string;
}

export interface DueSubscriptionInfo {
  subscriptionId: number;
  subscriptionNumber: string;
  customerName: string;
  planName: string;
  nextDueDate: string;
}
