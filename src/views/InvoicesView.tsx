import React, { useState } from 'react';
import { Invoice, InvoiceStatus, DueSubscriptionInfo } from '../types';
import {
  Receipt,
  Printer,
  CheckCircle,
  XCircle,
  Send,
  Zap,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCheck,
} from 'lucide-react';

interface InvoicesViewProps {
  invoices: Invoice[];
  dueSubscriptions: DueSubscriptionInfo[];
  totalOutstanding: number;
  overdueTotal: number;
  onGenerateDueInvoices: () => void;
  onUpdateInvoiceStatus: (invoiceId: number, newStatus: InvoiceStatus) => void;
  onMarkInvoiceSent: (invoiceId: number) => void;
  onPrintInvoice: (invoice: Invoice) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  dueSubscriptions,
  totalOutstanding,
  overdueTotal,
  onGenerateDueInvoices,
  onUpdateInvoiceStatus,
  onMarkInvoiceSent,
  onPrintInvoice,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const today = new Date().toISOString().split('T')[0];

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'all') return true;
    return inv.status === filterStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Outstanding Balance
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">
              ${totalOutstanding.toFixed(2)}
            </h3>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full">
              Confirmed Invoices
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Unpaid dues pending collection</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Overdue Dues
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-rose-600 font-mono">
              ${overdueTotal.toFixed(2)}
            </h3>
            <span className="text-xs text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-full">
              Past Due Date
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Requires immediate follow-up</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Subscriptions Due for Billing
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">
              {dueSubscriptions.length}
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                dueSubscriptions.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {dueSubscriptions.length > 0 ? 'Pending Cycles' : 'All Billed Up'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Ready to generate recurring invoice</p>
        </div>
      </div>

      {/* Automated Billing Control Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-400/30">
                <Zap className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-white">Periodic Billing Engine</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Brightloop automatically checks active contracts, detects unbilled periods, applies active coupon rules, and generates atomic tax invoices.
            </p>
          </div>

          <button
            onClick={onGenerateDueInvoices}
            disabled={dueSubscriptions.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Generate Due Invoices ({dueSubscriptions.length})</span>
          </button>
        </div>

        {dueSubscriptions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Queued Billing Subscriptions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {dueSubscriptions.map((ds) => (
                <div
                  key={ds.subscriptionId}
                  className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 text-xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-mono text-blue-300 font-semibold">{ds.subscriptionNumber}</span>
                    <span className="text-slate-300 block font-medium">{ds.customerName}</span>
                  </div>
                  <span className="text-amber-400 font-mono text-[11px] bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/30">
                    Due: {ds.nextDueDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoices List Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Invoices Ledger</h3>
            <p className="text-xs text-slate-500">
              Tax invoices with automated itemized breakdowns and payment statuses
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {['all', 'Draft', 'Confirmed', 'Paid', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition capitalize ${
                  filterStatus === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Invoice #</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Billing Cycle</th>
                <th className="py-3.5 px-5">Dates</th>
                <th className="py-3.5 px-5 text-right">Subtotal</th>
                <th className="py-3.5 px-5 text-right">Discount</th>
                <th className="py-3.5 px-5 text-right">Total</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isOverdue = inv.status === 'Confirmed' && inv.dueDate < today;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.subscriptionNumber}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                        <div className="text-xs text-slate-400">{inv.customerEmail}</div>
                      </td>

                      <td className="py-4 px-5 text-xs text-slate-600 font-mono">
                        <div>{inv.billingPeriodStart}</div>
                        <div className="text-slate-400">to {inv.billingPeriodEnd}</div>
                      </td>

                      <td className="py-4 px-5 text-xs font-mono">
                        <div className="text-slate-600">Inv: {inv.invoiceDate}</div>
                        <div className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                          Due: {inv.dueDate}
                        </div>
                        {inv.sentAt && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Sent {inv.sentAt.split('T')[0]}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right font-mono text-slate-600">
                        ${inv.subtotal.toFixed(2)}
                      </td>

                      <td className="py-4 px-5 text-right font-mono text-emerald-600 font-medium">
                        {inv.discountAmount > 0 ? (
                          <div>
                            <span>-${inv.discountAmount.toFixed(2)}</span>
                            {inv.discountCode && (
                              <span className="block text-[10px] text-emerald-700">
                                ({inv.discountCode})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">$0.00</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right font-mono font-bold text-slate-900 text-base">
                        ${inv.totalAmount.toFixed(2)}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
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
                        {isOverdue && (
                          <span className="block text-[10px] text-rose-600 font-extrabold mt-0.5">
                            OVERDUE
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => onPrintInvoice(inv)}
                            title="Print / View Tax Invoice"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200"
                          >
                            <Printer className="w-3 h-3 text-slate-600" />
                            <span>Print</span>
                          </button>

                          {inv.status === 'Draft' && (
                            <button
                              onClick={() => onUpdateInvoiceStatus(inv.id, 'Confirmed')}
                              title="Confirm Draft Invoice"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          )}

                          {(inv.status === 'Draft' || inv.status === 'Confirmed') && !inv.sentAt && (
                            <button
                              onClick={() => onMarkInvoiceSent(inv.id)}
                              title="Mark Sent to customer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send</span>
                            </button>
                          )}

                          {(inv.status === 'Draft' || inv.status === 'Confirmed') && (
                            <button
                              onClick={() => onUpdateInvoiceStatus(inv.id, 'Cancelled')}
                              title="Cancel invoice"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Cancel</span>
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
