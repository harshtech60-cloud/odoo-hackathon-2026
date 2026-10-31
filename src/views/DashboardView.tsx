import React from 'react';
import { Customer, Invoice, Payment, Subscription } from '../types';
import {
  Users,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Plus,
  Repeat,
  Package,
  CalendarDays,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface DashboardViewProps {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  onNavigate: (tab: NavTab) => void;
  onOpenNewCustomer: () => void;
  onOpenNewProduct: () => void;
  onOpenNewPlan: () => void;
  onOpenNewSubscription: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  subscriptions,
  invoices,
  payments,
  onNavigate,
  onOpenNewCustomer,
  onOpenNewProduct,
  onOpenNewPlan,
  onOpenNewSubscription,
}) => {
  // Compute normalized MRR from active subscriptions
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const mrr = activeSubs.reduce((acc, sub) => {
    let normalized = 0;
    if (sub.billingFrequency === 'daily') normalized = sub.totalAmount * 30;
    else if (sub.billingFrequency === 'weekly') normalized = sub.totalAmount * 4.33;
    else if (sub.billingFrequency === 'monthly') normalized = sub.totalAmount;
    else if (sub.billingFrequency === 'yearly') normalized = sub.totalAmount / 12;
    return acc + normalized;
  }, 0);

  // Payments received total
  const totalReceived = payments
    .filter((p) => p.status === 'Completed')
    .reduce((acc, p) => acc + p.amount, 0);

  // Outstanding amounts on Confirmed invoices
  const outstandingAmount = invoices
    .filter((inv) => inv.status === 'Confirmed')
    .reduce((acc, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      return acc + Math.max(0, inv.totalAmount - paid);
    }, 0);

  // Overdue total
  const today = new Date().toISOString().split('T')[0];
  const overdueTotal = invoices
    .filter((inv) => inv.status === 'Confirmed' && inv.dueDate < today)
    .reduce((acc, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      return acc + Math.max(0, inv.totalAmount - paid);
    }, 0);

  // Status breakdown
  const statusCounts = subscriptions.reduce<Record<string, number>>((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-7 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>Odoo × FLUX Hackathon 2026 Edition</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Welcome to Brightloop
          </h2>
          <p className="text-blue-100/90 text-sm leading-relaxed">
            Manage your entire subscription lifecycle, automated periodic billing,
            usage-based discounts, customer accounts, and real-time revenue analytics in one unified platform.
          </p>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {customers.length}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Registered business accounts</p>
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monthly Recurring (MRR)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight font-mono">
              ${mrr.toFixed(2)}
            </h3>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span>Normalized from active plans</span>
            </p>
          </div>
        </div>

        {/* Payments Received */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payments Collected
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight font-mono">
              ${totalReceived.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Successfully settled payments</p>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Dues
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight font-mono">
              ${outstandingAmount.toFixed(2)}
            </h3>
            <p className="text-xs text-rose-500 font-medium mt-1">
              {overdueTotal > 0 ? `$${overdueTotal.toFixed(2)} overdue` : 'No overdue invoices'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Quick System Actions</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={onOpenNewCustomer}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-blue-700 font-semibold text-sm transition group shadow-2xs"
          >
            <Plus className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>+ Add Customer</span>
          </button>

          <button
            onClick={onOpenNewProduct}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 font-semibold text-sm transition group shadow-2xs"
          >
            <Package className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span>+ Add Product</span>
          </button>

          <button
            onClick={onOpenNewPlan}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition group shadow-2xs"
          >
            <CalendarDays className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
            <span>+ Create Plan</span>
          </button>

          <button
            onClick={onOpenNewSubscription}
            className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-700 font-semibold text-sm transition group shadow-2xs"
          >
            <Repeat className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>+ New Subscription</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Subscription Lifecycle & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Status Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
              Subscription Statuses
            </h3>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Active', count: statusCounts['Active'] || 0, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Confirmed', count: statusCounts['Confirmed'] || 0, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Quotation', count: statusCounts['Quotation'] || 0, color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Draft', count: statusCounts['Draft'] || 0, color: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-100' },
              { label: 'Paused', count: statusCounts['Paused'] || 0, color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Closed', count: statusCounts['Closed'] || 0, color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
            ].map((st) => (
              <div key={st.label} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                  <span className="text-sm font-medium text-slate-800">{st.label}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                  {st.count}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Connected Lifecycle Flow</p>
            <p>Customer → Product → Plan → Subscription → Invoice → Payment → Reports</p>
          </div>
        </div>

        {/* Recent Invoices & Billing Attention */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">
                Recent Invoices
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest generated recurring bills</p>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
            >
              <span>Manage Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              No invoices generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="pb-3">Invoice #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Due Date</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 font-mono font-medium text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 text-slate-800 font-medium">
                        {inv.customerName}
                      </td>
                      <td className="py-3 text-slate-500 text-xs font-mono">
                        {inv.dueDate}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'Draft'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
