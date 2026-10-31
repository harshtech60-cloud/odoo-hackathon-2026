import React, { useState } from 'react';
import { Customer, Invoice, Payment, Subscription, SubscriptionStatus } from '../types';
import {
  UserCheck,
  Receipt,
  Repeat,
  CreditCard,
  Printer,
  Pause,
  Play,
  XCircle,
  Building,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

interface CustomerPortalViewProps {
  customers: Customer[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  payments: Payment[];
  onPrintInvoice: (invoice: Invoice) => void;
  onUpdateStatus: (subscriptionId: number, newStatus: SubscriptionStatus) => void;
  onPayInvoice: (invoiceId: number, amount: number) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  customers,
  subscriptions,
  invoices,
  payments,
  onPrintInvoice,
  onUpdateStatus,
  onPayInvoice,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(
    customers.length > 0 ? customers[0].id : 1
  );

  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const customerSubs = subscriptions.filter((s) => s.customerId === selectedCustomerId);
  const customerInvoices = invoices.filter((i) => i.customerId === selectedCustomerId);
  const customerPayments = payments.filter((p) => p.customerId === selectedCustomerId);

  // Compute customer balances
  const totalOutstanding = customerInvoices
    .filter((inv) => inv.status === 'Confirmed')
    .reduce((sum, inv) => {
      const paid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((acc, p) => acc + p.amount, 0);
      return sum + Math.max(0, inv.totalAmount - paid);
    }, 0);

  const activeCount = customerSubs.filter((s) => s.status === 'Active').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Customer Switcher Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/30">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Customer Self-Service Portal</span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {currentCustomer ? currentCustomer.name : 'Customer Account'}
          </h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            {currentCustomer?.email} {currentCustomer?.company ? `• ${currentCustomer.company}` : ''}
          </p>
        </div>

        {/* Switch Account */}
        <div className="flex items-center gap-2 bg-emerald-950/60 p-2 rounded-xl border border-emerald-800/60 text-xs">
          <span className="text-emerald-300/80 font-medium">Switch Client View:</span>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
            className="bg-emerald-900 text-white border border-emerald-700 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Account KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Active Subscriptions
          </span>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{activeCount}</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">Live service plans</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Outstanding Due
          </span>
          <h3 className="text-3xl font-bold text-amber-700 font-mono mt-2">
            ${totalOutstanding.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Awaiting settlement</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Invoices Issued
          </span>
          <h3 className="text-3xl font-bold text-slate-900 mt-2">{customerInvoices.length}</h3>
          <p className="text-xs text-slate-400 mt-1">Total billing records</p>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">My Subscriptions</h3>
          </div>
          <span className="text-xs text-slate-400">Self-service control</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-5">Plan</th>
                <th className="py-3 px-5">Products & Lines</th>
                <th className="py-3 px-5">Cadence</th>
                <th className="py-3 px-5">Term Dates</th>
                <th className="py-3 px-5 text-right">Fee</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Self Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    No subscriptions registered for this customer.
                  </td>
                </tr>
              ) : (
                customerSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      <div>{sub.planName}</div>
                      <span className="text-xs font-mono text-slate-400">{sub.subscriptionNumber}</span>
                    </td>

                    <td className="py-3.5 px-5 text-xs text-slate-600">
                      {sub.lines.map((l) => (
                        <div key={l.id}>
                          {l.quantity}x {l.productName}
                        </div>
                      ))}
                    </td>

                    <td className="py-3.5 px-5 text-xs font-semibold capitalize text-blue-600">
                      {sub.billingFrequency}
                    </td>

                    <td className="py-3.5 px-5 text-xs font-mono text-slate-500">
                      <div>Start: {sub.startDate}</div>
                      <div>Exp: {sub.expiryDate}</div>
                    </td>

                    <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                      ${sub.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          sub.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'Paused'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sub.status === 'Active' && sub.allowPause !== false && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Paused')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-orange-800 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}

                        {sub.status === 'Paused' && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Active')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}

                        {(sub.status === 'Active' || sub.status === 'Paused') &&
                          sub.allowEarlyClose !== false && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this subscription?')) {
                                  onUpdateStatus(sub.id, 'Closed');
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices & Statements */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Invoices & Statements</h3>
          </div>
          <span className="text-xs text-slate-400">Download and verify tax invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3 px-5">Invoice #</th>
                <th className="py-3 px-5">Cycle</th>
                <th className="py-3 px-5">Due Date</th>
                <th className="py-3 px-5 text-right">Invoice Total</th>
                <th className="py-3 px-5 text-right">Balance Due</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                customerInvoices.map((inv) => {
                  const paid = payments
                    .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
                    .reduce((sum, p) => sum + p.amount, 0);
                  const bal = Number(Math.max(0, inv.totalAmount - paid).toFixed(2));

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-5 text-xs text-slate-500 font-mono">
                        {inv.billingPeriodStart} to {inv.billingPeriodEnd}
                      </td>

                      <td className="py-3.5 px-5 text-xs font-mono text-slate-600">
                        {inv.dueDate}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                        ${inv.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-5 text-right font-mono font-bold text-amber-700">
                        ${bal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'Confirmed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                          >
                            <Printer className="w-3 h-3 text-slate-500" />
                            <span>Print</span>
                          </button>

                          {inv.status === 'Confirmed' && bal > 0 && (
                            <button
                              onClick={() => onPayInvoice(inv.id, bal)}
                              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                            >
                              <span>Pay Online</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
