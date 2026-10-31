import React, { useState } from 'react';
import { Invoice, Payment, PaymentMethod, PaymentStatus } from '../types';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  AlertOctagon,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Receipt,
} from 'lucide-react';

interface PaymentsViewProps {
  payments: Payment[];
  invoices: Invoice[];
  onAddPayment: (paymentData: {
    invoiceId: number;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    notes?: string;
    status: PaymentStatus;
  }) => { ok: boolean; error?: string };
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  invoices,
  onAddPayment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Outstanding confirmed invoices
  const outstandingInvoices = invoices
    .filter((inv) => inv.status === 'Confirmed')
    .map((inv) => {
      const alreadyPaid = payments
        .filter((p) => p.invoiceId === inv.id && p.status === 'Completed')
        .reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Number(Math.max(0, inv.totalAmount - alreadyPaid).toFixed(2));
      return { ...inv, balanceDue, alreadyPaid };
    })
    .filter((inv) => inv.balanceDue > 0);

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('Completed');
  const [formError, setFormError] = useState<string | null>(null);

  const selectedInvoice = outstandingInvoices.find((i) => i.id === Number(selectedInvoiceId));

  const handleOpenModal = (invId?: number) => {
    setFormError(null);
    if (invId) {
      setSelectedInvoiceId(invId);
      const inv = outstandingInvoices.find((i) => i.id === invId);
      if (inv) setAmount(inv.balanceDue.toFixed(2));
    } else if (outstandingInvoices.length > 0) {
      setSelectedInvoiceId(outstandingInvoices[0].id);
      setAmount(outstandingInvoices[0].balanceDue.toFixed(2));
    }
    setPaymentDate(todayStr);
    setPaymentMethod('Bank Transfer');
    setTransactionRef('');
    setNotes('');
    setStatus('Completed');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(amount);
    if (!selectedInvoiceId || isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (selectedInvoice && amt > selectedInvoice.balanceDue) {
      setFormError(
        `Payment amount exceeds outstanding balance of $${selectedInvoice.balanceDue.toFixed(2)}.`
      );
      return;
    }

    const res = onAddPayment({
      invoiceId: Number(selectedInvoiceId),
      amount: amt,
      paymentDate,
      paymentMethod,
      transactionReference: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    });

    if (res.ok) {
      setIsModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to record payment.');
    }
  };

  // KPI Calculations
  const totalReceived = payments
    .filter((p) => p.status === 'Completed')
    .reduce((acc, p) => acc + p.amount, 0);

  const pendingTotal = payments
    .filter((p) => p.status === 'Pending')
    .reduce((acc, p) => acc + p.amount, 0);

  const failedCount = payments.filter((p) => p.status === 'Failed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Settled Collections
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-slate-900 font-mono">
              ${totalReceived.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Completed & cleared payments</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Clearances
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-amber-700 font-mono">
              ${pendingTotal.toFixed(2)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Under verification or bank hold</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Failed Transactions
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-bold text-rose-600 font-mono">
              {failedCount}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Declined or gateway errors</p>
          </div>
        </div>
      </div>

      {/* Outstanding Invoices Banner */}
      {outstandingInvoices.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-700" />
              <h3 className="font-bold text-amber-900 text-sm">
                Invoices Awaiting Payment ({outstandingInvoices.length})
              </h3>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="text-xs font-semibold text-amber-900 hover:text-black flex items-center gap-1"
            >
              <span>Pay Any</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outstandingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex justify-between items-center"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900 text-xs">
                    {inv.invoiceNumber}
                  </div>
                  <div className="text-xs text-slate-600 font-medium">{inv.customerName}</div>
                  <div className="text-[11px] text-amber-700 font-mono font-semibold mt-0.5">
                    Balance: ${inv.balanceDue.toFixed(2)}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(inv.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                >
                  Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Payment Transactions</h3>
            <p className="text-xs text-slate-500">
              Audit log of all payments matched against customer invoices
            </p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            disabled={outstandingInvoices.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Payment Ref</th>
                <th className="py-3.5 px-5">Invoice #</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Payment Date</th>
                <th className="py-3.5 px-5">Method</th>
                <th className="py-3.5 px-5">Transaction Ref</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-5 font-mono font-bold text-slate-900">
                      {p.paymentNumber}
                    </td>

                    <td className="py-4 px-5 font-mono font-medium text-blue-600">
                      {p.invoiceNumber}
                    </td>

                    <td className="py-4 px-5 font-medium text-slate-900">{p.customerName}</td>

                    <td className="py-4 px-5 text-xs text-slate-600 font-mono">{p.paymentDate}</td>

                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="py-4 px-5 font-mono text-xs text-slate-500">
                      {p.transactionReference || '—'}
                    </td>

                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900 text-base">
                      ${p.amount.toFixed(2)}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                          p.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Record Customer Payment</h3>
                <p className="text-xs text-slate-500">
                  Post credit against an existing confirmed invoice
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Confirmed Invoice *
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedInvoiceId(id);
                    const inv = outstandingInvoices.find((i) => i.id === id);
                    if (inv) setAmount(inv.balanceDue.toFixed(2));
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {outstandingInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customerName} (Due: ${inv.balanceDue.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span>Invoice Total:</span>
                    <span className="font-mono font-medium">${selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Already Received:</span>
                    <span className="font-mono text-emerald-700 font-medium">
                      ${selectedInvoice.alreadyPaid.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-blue-200">
                    <span>Remaining Balance:</span>
                    <span className="font-mono">${selectedInvoice.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Bank Transfer">Bank Transfer (ACH / NEFT)</option>
                    <option value="UPI">UPI / Instant Pay</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash Receipt</option>
                    <option value="Other">Other Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Transaction Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Completed">Completed (Cleared)</option>
                    <option value="Pending">Pending (Processing)</option>
                    <option value="Failed">Failed (Declined)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction Reference (UTR / Chk #)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-ACH-8921820"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared through Wells Fargo checking"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
