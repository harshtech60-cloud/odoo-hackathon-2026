import React, { useState, useEffect } from 'react';
import {
  Customer,
  Discount,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
} from './types';
import { StorageService } from './services/storage';
import {
  findDueSubscriptions,
  generateDueInvoicesEngine,
  formatDate,
  addMonths,
} from './services/billing';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ToastContainer, ToastMessage } from './components/Toast';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';

// Views
import { DashboardView } from './views/DashboardView';
import { CustomersView } from './views/CustomersView';
import { ProductsView } from './views/ProductsView';
import { PlansView } from './views/PlansView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { InvoicesView } from './views/InvoicesView';
import { PaymentsView } from './views/PaymentsView';
import { DiscountsView } from './views/DiscountsView';
import { ReportsView } from './views/ReportsView';
import { CustomerPortalView } from './views/CustomerPortalView';

export const App: React.FC = () => {
  // Navigation & Role
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Application Data State
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => StorageService.getPlans());
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() =>
    StorageService.getSubscriptions()
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() => StorageService.getInvoices());
  const [payments, setPayments] = useState<Payment[]>(() => StorageService.getPayments());
  const [discounts, setDiscounts] = useState<Discount[]>(() => StorageService.getDiscounts());

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Print Invoice Modal State
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // Sync to localStorage
  useEffect(() => {
    StorageService.setCustomers(customers);
  }, [customers]);

  useEffect(() => {
    StorageService.setProducts(products);
  }, [products]);

  useEffect(() => {
    StorageService.setPlans(plans);
  }, [plans]);

  useEffect(() => {
    StorageService.setSubscriptions(subscriptions);
  }, [subscriptions]);

  useEffect(() => {
    StorageService.setInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    StorageService.setPayments(payments);
  }, [payments]);

  useEffect(() => {
    StorageService.setDiscounts(discounts);
  }, [discounts]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetData = () => {
    if (window.confirm('Reset all records to standard demo data?')) {
      StorageService.resetToDemoData();
      setCustomers(StorageService.getCustomers());
      setProducts(StorageService.getProducts());
      setPlans(StorageService.getPlans());
      setSubscriptions(StorageService.getSubscriptions());
      setInvoices(StorageService.getInvoices());
      setPayments(StorageService.getPayments());
      setDiscounts(StorageService.getDiscounts());
      addToast('info', 'Demo data reset to initial showcase baseline.');
    }
  };

  // ----------------------------------------------------
  // Customer Handlers
  // ----------------------------------------------------
  const handleAddCustomer = (data: Omit<Customer, 'id' | 'createdAt'>) => {
    const emailExists = customers.some(
      (c) => c.email.toLowerCase() === data.email.toLowerCase()
    );
    if (emailExists) {
      return { ok: false, error: 'A customer with this email address already exists.' };
    }

    const nextId = customers.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const newCustomer: Customer = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    addToast('success', `Customer "${newCustomer.name}" added successfully.`);
    return { ok: true };
  };

  // ----------------------------------------------------
  // Product Handlers
  // ----------------------------------------------------
  const handleAddProduct = (data: Omit<Product, 'id' | 'createdAt' | 'variants'>) => {
    const nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const newProduct: Product = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
      variants: [],
    };

    setProducts((prev) => [newProduct, ...prev]);
    addToast('success', `Product "${newProduct.name}" created successfully.`);
  };

  const handleAddVariant = (productId: number, variantName: string, extraPrice: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return { ok: false, error: 'Product not found.' };

    const exists = product.variants.some(
      (v) => v.variantName.toLowerCase() === variantName.toLowerCase()
    );
    if (exists) {
      return { ok: false, error: 'A variant with this name already exists for this product.' };
    }

    const nextVariantId =
      products
        .flatMap((p) => p.variants)
        .reduce((max, v) => Math.max(max, v.id), 0) + 1;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            variants: [
              ...p.variants,
              { id: nextVariantId, productId, variantName, extraPrice },
            ],
          };
        }
        return p;
      })
    );

    addToast('success', `Variant "${variantName}" added to ${product.name}.`);
    return { ok: true };
  };

  // ----------------------------------------------------
  // Plan Handlers
  // ----------------------------------------------------
  const handleAddPlan = (data: Omit<SubscriptionPlan, 'id' | 'createdAt'>) => {
    const nextId = plans.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const newPlan: SubscriptionPlan = {
      ...data,
      id: nextId,
      createdAt: new Date().toISOString(),
    };

    setPlans((prev) => [newPlan, ...prev]);
    addToast('success', `Subscription plan "${newPlan.name}" created successfully.`);
    return { ok: true };
  };

  // ----------------------------------------------------
  // Subscription Handlers
  // ----------------------------------------------------
  const handleAddSubscription = (subData: {
    customerId: number;
    planId: number;
    productId: number;
    variantId?: number;
    quantity: number;
    taxRate: number;
    paymentTermsDays: number;
    startDate: string;
    expiryDate: string;
  }) => {
    const customer = customers.find((c) => c.id === subData.customerId);
    const plan = plans.find((p) => p.id === subData.planId);
    const product = products.find((p) => p.id === subData.productId);
    const variant = product?.variants.find((v) => v.id === subData.variantId);

    if (!customer || !plan || !product) {
      return { ok: false, error: 'Invalid customer, plan, or product.' };
    }

    const nextId = subscriptions.reduce((max, s) => Math.max(max, s.id), 0) + 1;
    const subNumber = `SUB-${String(nextId).padStart(5, '0')}`;

    const variantExtra = variant ? variant.extraPrice : 0;
    const unitPrice = product.salesPrice + variantExtra;
    const lineSubtotal = Number((unitPrice * subData.quantity).toFixed(2));
    const subtotal = Number((plan.price + lineSubtotal).toFixed(2));
    const taxAmount = Number(((subtotal * subData.taxRate) / 100).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));

    const newSub: Subscription = {
      id: nextId,
      subscriptionNumber: subNumber,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      planId: plan.id,
      planName: plan.name,
      billingFrequency: plan.billingFrequency,
      startDate: subData.startDate,
      expiryDate: subData.expiryDate,
      paymentTermsDays: subData.paymentTermsDays,
      status: 'Draft',
      planPrice: plan.price,
      subtotal,
      taxAmount,
      totalAmount,
      createdAt: new Date().toISOString(),
      allowPause: plan.allowPause,
      allowEarlyClose: plan.allowEarlyClose,
      allowRenewal: plan.allowRenewal,
      lines: [
        {
          id: nextId * 10,
          subscriptionId: nextId,
          productId: product.id,
          variantId: variant?.id,
          productName: product.name,
          variantName: variant?.variantName,
          quantity: subData.quantity,
          unitPrice,
          taxRate: subData.taxRate,
          lineSubtotal,
        },
      ],
    };

    setSubscriptions((prev) => [newSub, ...prev]);
    addToast('success', `Draft subscription ${subNumber} created.`);
    return { ok: true };
  };

  const handleUpdateSubscriptionStatus = (
    subscriptionId: number,
    newStatus: SubscriptionStatus
  ) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === subscriptionId ? { ...s, status: newStatus } : s))
    );
    addToast('success', `Subscription status changed to ${newStatus}.`);
  };

  const handleRenewSubscription = (subscriptionId: number) => {
    setSubscriptions((prev) =>
      prev.map((s) => {
        if (s.id === subscriptionId) {
          const currentExp = new Date(s.expiryDate);
          const newExp = addMonths(currentExp, 12);
          return {
            ...s,
            expiryDate: formatDate(newExp),
            status: 'Active',
          };
        }
        return s;
      })
    );
    addToast('success', 'Subscription renewed for 1 year and set to Active.');
  };

  // ----------------------------------------------------
  // Invoices & Billing Engine
  // ----------------------------------------------------
  const today = new Date();
  const dueSubscriptions = findDueSubscriptions(subscriptions, invoices, today);

  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'Confirmed')
    .reduce((acc, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      return acc + Math.max(0, inv.totalAmount - paid);
    }, 0);

  const todayStr = formatDate(today);
  const overdueTotal = invoices
    .filter((inv) => inv.status === 'Confirmed' && inv.dueDate < todayStr)
    .reduce((acc, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      return acc + Math.max(0, inv.totalAmount - paid);
    }, 0);

  const handleGenerateDueInvoices = () => {
    const result = generateDueInvoicesEngine(subscriptions, invoices, discounts, today);

    if (result.createdCount === 0) {
      addToast('info', 'No subscriptions are currently due for billing.');
      return;
    }

    setInvoices((prev) => [...result.newInvoices, ...prev]);
    setDiscounts(result.updatedDiscounts);
    addToast('success', `Generated ${result.createdCount} periodic invoice(s) with discounts applied.`);
  };

  const handleUpdateInvoiceStatus = (invoiceId: number, newStatus: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((i) => (i.id === invoiceId ? { ...i, status: newStatus } : i))
    );
    addToast('success', `Invoice status changed to ${newStatus}.`);
  };

  const handleMarkInvoiceSent = (invoiceId: number) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === invoiceId ? { ...i, sentAt: new Date().toISOString() } : i
      )
    );
    addToast('success', 'Invoice marked as sent to customer email.');
  };

  // ----------------------------------------------------
  // Payments Handlers
  // ----------------------------------------------------
  const handleAddPayment = (paymentData: {
    invoiceId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    notes?: string;
    status: PaymentStatus;
  }) => {
    const inv = invoices.find((i) => i.id === paymentData.invoiceId);
    if (!inv) return { ok: false, error: 'Invoice not found.' };

    const nextId = payments.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const paymentNumber = `PAY-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    const newPayment: Payment = {
      id: nextId,
      paymentNumber,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: inv.customerName,
      paymentDate: paymentData.paymentDate,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      transactionReference: paymentData.transactionReference,
      notes: paymentData.notes,
      status: paymentData.status,
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [newPayment, ...prev]);

    // Check if invoice balance hits 0 upon completed payment
    if (paymentData.status === 'Completed') {
      const alreadyPaid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);

      const totalPaidNow = alreadyPaid + paymentData.amount;
      if (totalPaidNow >= inv.totalAmount - 0.001) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, status: 'Paid' } : i))
        );
        addToast('success', `Invoice ${inv.invoiceNumber} paid in full!`);
      } else {
        addToast('success', `Payment of $${paymentData.amount.toFixed(2)} recorded.`);
      }
    } else {
      addToast('info', `Payment recorded with status ${paymentData.status}.`);
    }

    return { ok: true };
  };

  const handlePayOnlineCustomer = (invoiceId: number, amount: number) => {
    const res = handleAddPayment({
      invoiceId,
      amount,
      paymentDate: todayStr,
      paymentMethod: 'Card',
      transactionReference: `PORTAL-PAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      notes: 'Paid via Customer Portal Online Checkout',
      status: 'Completed',
    });
    if (res.ok) {
      addToast('success', `Online payment of $${amount.toFixed(2)} processed successfully!`);
    }
  };

  // ----------------------------------------------------
  // Discounts Handlers
  // ----------------------------------------------------
  const handleAddDiscount = (
    data: Omit<Discount, 'id' | 'createdAt' | 'usedCount' | 'status'>
  ) => {
    const codeExists = discounts.some(
      (d) => d.code.toUpperCase() === data.code.toUpperCase()
    );
    if (codeExists) {
      return { ok: false, error: 'A discount code with this name already exists.' };
    }

    const nextId = discounts.reduce((max, d) => Math.max(max, d.id), 0) + 1;
    const newDiscount: Discount = {
      ...data,
      id: nextId,
      usedCount: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    setDiscounts((prev) => [newDiscount, ...prev]);
    addToast('success', `Discount code "${newDiscount.code}" created.`);
    return { ok: true };
  };

  const handleToggleDiscountStatus = (discountId: number) => {
    setDiscounts((prev) =>
      prev.map((d) =>
        d.id === discountId
          ? { ...d, status: d.status === 'Active' ? 'Inactive' : 'Active' }
          : d
      )
    );
    addToast('info', 'Discount status updated.');
  };

  const handleDeleteDiscount = (discountId: number) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== discountId));
    addToast('success', 'Discount rule deleted.');
    return { ok: true };
  };

  // Header Title & Subtitle helper
  const getHeaderMeta = () => {
    switch (currentTab) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Welcome back to Brightloop Software' };
      case 'customers':
        return { title: 'Customer Management', subtitle: 'Manage client accounts and contacts' };
      case 'products':
        return { title: 'Product & Variant Catalog', subtitle: 'Subscription products, licenses, and addons' };
      case 'plans':
        return { title: 'Subscription Plans', subtitle: 'Billing cadences and contract policies' };
      case 'subscriptions':
        return { title: 'Subscriptions Lifecycle', subtitle: 'Quotations, active contracts, and renewals' };
      case 'invoices':
        return { title: 'Invoices & Billing', subtitle: 'Periodic billing, auto discounts, and tax invoices' };
      case 'payments':
        return { title: 'Payment Transactions', subtitle: 'Invoice settlement and cash collections' };
      case 'discounts':
        return { title: 'Discounts & Promotions', subtitle: 'Percentage and fixed value promotional rules' };
      case 'reports':
        return { title: 'Reports & Analytics', subtitle: 'ARR, MRR, cashflow trends, and lifecycle KPIs' };
      case 'portal':
        return { title: 'Customer Portal', subtitle: 'Self-service client billing and subscription view' };
    }
  };

  const meta = getHeaderMeta();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        dueInvoicesCount={dueSubscriptions.length}
        activeSubsCount={subscriptions.filter((s) => s.status === 'Active').length}
        userRole={currentRole}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onResetData={handleResetData}
        />

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                customers={customers}
                subscriptions={subscriptions}
                invoices={invoices}
                payments={payments}
                onNavigate={setCurrentTab}
                onOpenNewCustomer={() => setCurrentTab('customers')}
                onOpenNewProduct={() => setCurrentTab('products')}
                onOpenNewPlan={() => setCurrentTab('plans')}
                onOpenNewSubscription={() => setCurrentTab('subscriptions')}
              />
            )}

            {currentTab === 'customers' && (
              <CustomersView
                customers={customers}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {currentTab === 'products' && (
              <ProductsView
                products={products}
                onAddProduct={handleAddProduct}
                onAddVariant={handleAddVariant}
              />
            )}

            {currentTab === 'plans' && (
              <PlansView
                plans={plans}
                onAddPlan={handleAddPlan}
              />
            )}

            {currentTab === 'subscriptions' && (
              <SubscriptionsView
                subscriptions={subscriptions}
                customers={customers}
                plans={plans}
                products={products}
                onAddSubscription={handleAddSubscription}
                onUpdateStatus={handleUpdateSubscriptionStatus}
                onRenewSubscription={handleRenewSubscription}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoicesView
                invoices={invoices}
                dueSubscriptions={dueSubscriptions}
                totalOutstanding={totalOutstanding}
                overdueTotal={overdueTotal}
                onGenerateDueInvoices={handleGenerateDueInvoices}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                onMarkInvoiceSent={handleMarkInvoiceSent}
                onPrintInvoice={setPrintInvoice}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                payments={payments}
                invoices={invoices}
                onAddPayment={handleAddPayment}
              />
            )}

            {currentTab === 'discounts' && (
              <DiscountsView
                discounts={discounts}
                products={products}
                onAddDiscount={handleAddDiscount}
                onToggleStatus={handleToggleDiscountStatus}
                onDeleteDiscount={handleDeleteDiscount}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                customers={customers}
                subscriptions={subscriptions}
                invoices={invoices}
                payments={payments}
              />
            )}

            {currentTab === 'portal' && (
              <CustomerPortalView
                customers={customers}
                subscriptions={subscriptions}
                invoices={invoices}
                payments={payments}
                onPrintInvoice={setPrintInvoice}
                onUpdateStatus={handleUpdateSubscriptionStatus}
                onPayInvoice={handlePayOnlineCustomer}
              />
            )}
          </div>
        </main>
      </div>

      {/* Printable Invoice Modal */}
      <PrintInvoiceModal
        invoice={printInvoice}
        onClose={() => setPrintInvoice(null)}
      />

      {/* Global Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
