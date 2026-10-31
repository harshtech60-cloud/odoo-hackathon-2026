import React from 'react';
import { Invoice } from '../types';
import { Printer, X, Download, CheckCircle, ShieldCheck } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Actions Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <span>Invoice Preview:</span>
            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {invoice.invoiceNumber}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'Confirmed'
                  ? 'bg-amber-100 text-amber-800'
                  : invoice.status === 'Draft'
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 text-slate-800 space-y-8 bg-white" id="invoice-print-content">
          {/* Top Brand & Metadata Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  BL
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  BRIGHTLOOP
                </h2>
              </div>
              <p className="text-sm text-slate-500 font-medium">Brightloop Software Technologies Pvt Ltd</p>
              <p className="text-xs text-slate-400">Subscription & Cloud ERP Operations</p>
              <p className="text-xs text-slate-400 mt-1">Tax ID: BL-8829-GST-2026</p>
            </div>

            <div className="text-right">
              <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">TAX INVOICE</h1>
              <p className="font-mono text-base font-semibold text-slate-700 mt-1">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Date: <strong className="text-slate-700">{invoice.invoiceDate}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Payment Due: <strong className="text-rose-600">{invoice.dueDate}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Subscription Metadata */}
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Billed To
              </span>
              <p className="font-bold text-base text-slate-900">{invoice.customerName}</p>
              {invoice.customerCompany && (
                <p className="text-slate-600 text-xs font-medium">{invoice.customerCompany}</p>
              )}
              <p className="text-slate-600 text-xs mt-1">{invoice.customerEmail}</p>
              {invoice.customerPhone && (
                <p className="text-slate-600 text-xs">{invoice.customerPhone}</p>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-right">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Subscription Details
              </span>
              <p className="text-xs text-slate-600">
                Subscription Ref:{' '}
                <strong className="text-slate-900 font-mono">{invoice.subscriptionNumber}</strong>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Billing Cycle:{' '}
                <strong className="text-slate-900">
                  {invoice.billingPeriodStart} to {invoice.billingPeriodEnd}
                </strong>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Status:{' '}
                <span className="font-semibold text-blue-600">{invoice.status}</span>
              </p>
            </div>
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-2 font-semibold">Description</th>
                  <th className="py-3 px-2 font-semibold text-center">Qty</th>
                  <th className="py-3 px-2 font-semibold text-right">Unit Price</th>
                  <th className="py-3 px-2 font-semibold text-right">Tax Rate</th>
                  {invoice.discountAmount > 0 && (
                    <th className="py-3 px-2 font-semibold text-right text-emerald-600">Discount</th>
                  )}
                  <th className="py-3 px-2 font-semibold text-right">Tax Amount</th>
                  <th className="py-3 px-2 font-semibold text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="py-3.5 px-2 font-medium text-slate-900">
                      {line.description}
                    </td>
                    <td className="py-3.5 px-2 text-center text-slate-600">{line.quantity}</td>
                    <td className="py-3.5 px-2 text-right text-slate-600 font-mono">
                      ${line.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-2 text-right text-slate-600">{line.taxRate}%</td>
                    {invoice.discountAmount > 0 && (
                      <td className="py-3.5 px-2 text-right text-emerald-600 font-mono">
                        {line.discountAmount > 0 ? `-$${line.discountAmount.toFixed(2)}` : '$0.00'}
                      </td>
                    )}
                    <td className="py-3.5 px-2 text-right text-slate-600 font-mono">
                      ${line.taxAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-bold text-slate-900 font-mono">
                      ${line.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-72 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Before Tax & Disc):</span>
                <span className="font-mono font-medium">${invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>
                    Discount Applied {invoice.discountCode ? `(${invoice.discountCode})` : ''}:
                  </span>
                  <span className="font-mono">-${invoice.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax (GST/VAT):</span>
                <span className="font-mono font-medium">${invoice.taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>Total Amount Due:</span>
                <span className="font-mono text-blue-700 text-lg">
                  ${invoice.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-100 pt-6 text-xs text-slate-500 flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-700">Thank you for your business!</p>
              <p className="mt-0.5">Payment is due within designated payment terms from invoice issuance.</p>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified System Invoice</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
