import React from 'react';
import { Customer, Invoice, Payment, Subscription } from '../types';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  PieChart,
  BarChart2,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface ReportsViewProps {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  customers,
  subscriptions,
  invoices,
  payments,
}) => {
  // 1. Total revenue received
  const totalRevenue = payments
    .filter((p) => p.status === 'Completed')
    .reduce((sum, p) => sum + p.amount, 0);

  // 2. Pending payments
  const pendingPayments = payments
    .filter((p) => p.status === 'Pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // 3. Outstanding amount
  const outstandingAmount = invoices
    .filter((i) => i.status === 'Confirmed')
    .reduce((sum, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((acc, p) => acc + p.amount, 0);
      return sum + Math.max(0, inv.totalAmount - paid);
    }, 0);

  // 4. MRR & ARR
  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const mrr = activeSubs.reduce((acc, sub) => {
    let normalized = 0;
    if (sub.billingFrequency === 'daily') normalized = sub.totalAmount * 30;
    else if (sub.billingFrequency === 'weekly') normalized = sub.totalAmount * 4.33;
    else if (sub.billingFrequency === 'monthly') normalized = sub.totalAmount;
    else if (sub.billingFrequency === 'yearly') normalized = sub.totalAmount / 12;
    return acc + normalized;
  }, 0);
  const arr = mrr * 12;

  // 5. Subscription Status Summary
  const subStats = subscriptions.reduce<Record<string, number>>((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  // 6. Invoice Status Summary
  const invStats = invoices.reduce<Record<string, { count: number; total: number }>>((acc, inv) => {
    if (!acc[inv.status]) acc[inv.status] = { count: 0, total: 0 };
    acc[inv.status].count += 1;
    acc[inv.status].total += inv.totalAmount;
    return acc;
  }, {});

  // 7. Payment Methods Summary
  const methodStats = payments
    .filter((p) => p.status === 'Completed')
    .reduce<Record<string, { count: number; total: number }>>((acc, p) => {
      if (!acc[p.paymentMethod]) acc[p.paymentMethod] = { count: 0, total: 0 };
      acc[p.paymentMethod].count += 1;
      acc[p.paymentMethod].total += p.amount;
      return acc;
    }, {});

  // 8. Monthly Revenue Breakdown
  const monthlyRevenue = payments
    .filter((p) => p.status === 'Completed')
    .reduce<Record<string, number>>((acc, p) => {
      const m = p.paymentDate.slice(0, 7); // YYYY-MM
      acc[m] = (acc[m] || 0) + p.amount;
      return acc;
    }, {});

  const sortedMonths = Object.keys(monthlyRevenue).sort();
  const maxMonthRev = Math.max(...Object.values(monthlyRevenue), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Financial Reports & Performance Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time ARR, MRR, cash collections, billing pipeline health, and payment gateways
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>Real-time Financial Snapshot</span>
        </div>
      </div>

      {/* KPI Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Annual Recurring (ARR)
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 font-mono mt-3">
            ${arr.toFixed(2)}
          </h3>
          <p className="text-xs text-blue-600 font-medium mt-1">MRR × 12 annualized</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Monthly Recurring (MRR)
          </span>
          <h3 className="text-3xl font-extrabold text-emerald-600 font-mono mt-3">
            ${mrr.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Normalized active subscriptions</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Revenue Collected
          </span>
          <h3 className="text-3xl font-extrabold text-slate-900 font-mono mt-3">
            ${totalRevenue.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">All-time settled payments</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Uncollected Receivables
          </span>
          <h3 className="text-3xl font-extrabold text-amber-700 font-mono mt-3">
            ${outstandingAmount.toFixed(2)}
          </h3>
          <p className="text-xs text-amber-600/80 font-medium mt-1">
            +${pendingPayments.toFixed(2)} in flight
          </p>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Revenue Trajectory by Month</h3>
            <p className="text-xs text-slate-500">Collected payments grouped by settlement date</p>
          </div>
          <div className="text-right font-mono text-xs font-bold text-slate-700">
            Total: ${totalRevenue.toFixed(2)}
          </div>
        </div>

        {sortedMonths.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No monthly payment history recorded yet.</div>
        ) : (
          <div className="space-y-4">
            {sortedMonths.map((m) => {
              const rev = monthlyRevenue[m];
              const pct = (rev / maxMonthRev) * 100;
              return (
                <div key={m} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span className="font-mono font-semibold">{m}</span>
                    <span className="font-mono font-bold">${rev.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscriptions Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Subscription Statuses</span>
          </h3>

          <div className="space-y-2.5">
            {['Active', 'Confirmed', 'Quotation', 'Draft', 'Paused', 'Closed'].map((st) => {
              const count = subStats[st] || 0;
              const totalSubs = subscriptions.length || 1;
              const pct = ((count / totalSubs) * 100).toFixed(0);

              return (
                <div key={st} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{st}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/60 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        st === 'Active'
                          ? 'bg-emerald-500'
                          : st === 'Confirmed'
                          ? 'bg-amber-500'
                          : st === 'Quotation'
                          ? 'bg-blue-500'
                          : st === 'Paused'
                          ? 'bg-orange-500'
                          : st === 'Closed'
                          ? 'bg-rose-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Health Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Invoice Health</span>
          </h3>

          <div className="space-y-3">
            {['Paid', 'Confirmed', 'Draft', 'Cancelled'].map((st) => {
              const data = invStats[st] || { count: 0, total: 0 };
              return (
                <div key={st} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{st}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {data.count} invoices
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 text-slate-500 font-mono">
                    <span>Value:</span>
                    <span className="font-bold text-slate-800">${data.total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Gateway Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Payment Methods</span>
          </h3>

          <div className="space-y-3">
            {Object.keys(methodStats).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No completed payments.</p>
            ) : (
              Object.entries(methodStats).map(([method, data]) => {
                const pct = totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(0) : '0';
                return (
                  <div key={method} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{method}</span>
                      <span className="font-bold text-slate-900 font-mono">{pct}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-1 text-slate-500 font-mono">
                      <span>{data.count} transactions</span>
                      <span className="font-bold text-emerald-700">${data.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
