import React, { useState } from 'react';
import {
  Customer,
  Product,
  ProductVariant,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../types';
import {
  Repeat,
  Plus,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  customers: Customer[];
  plans: SubscriptionPlan[];
  products: Product[];
  onAddSubscription: (subData: {
    customerId: number;
    planId: number;
    productId: number;
    variantId?: number;
    quantity: number;
    taxRate: number;
    paymentTermsDays: number;
    startDate: string;
    expiryDate: string;
  }) => { ok: boolean; error?: string };
  onUpdateStatus: (subscriptionId: number, newStatus: SubscriptionStatus) => void;
  onRenewSubscription: (subscriptionId: number) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  customers,
  plans,
  products,
  onAddSubscription,
  onUpdateStatus,
  onRenewSubscription,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Default next year
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const nextYearStr = nextYear.toISOString().split('T')[0];

  // Form State
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [planId, setPlanId] = useState<number | ''>('');
  const [productId, setProductId] = useState<number | ''>('');
  const [variantId, setVariantId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('1');
  const [taxRate, setTaxRate] = useState('18');
  const [paymentTermsDays, setPaymentTermsDays] = useState('7');
  const [startDate, setStartDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState(nextYearStr);
  const [formError, setFormError] = useState<string | null>(null);

  // Compute live preview pricing
  const selectedPlan = plans.find((p) => p.id === Number(planId));
  const selectedProduct = products.find((p) => p.id === Number(productId));
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === Number(variantId));

  const planPrice = selectedPlan ? selectedPlan.price : 0;
  const unitPrice = (selectedProduct ? selectedProduct.salesPrice : 0) + (selectedVariant ? selectedVariant.extraPrice : 0);
  const qty = parseInt(quantity, 10) || 1;
  const productSubtotal = unitPrice * qty;
  const subtotal = planPrice + productSubtotal;
  const tr = parseFloat(taxRate) || 0;
  const taxAmount = Number(((subtotal * tr) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const handleOpenModal = () => {
    if (customers.length > 0) setCustomerId(customers[0].id);
    if (plans.length > 0) setPlanId(plans[0].id);
    if (products.length > 0) {
      setProductId(products[0].id);
      setVariantId('');
    }
    setQuantity('1');
    setTaxRate('18');
    setPaymentTermsDays('7');
    setStartDate(todayStr);
    setExpiryDate(nextYearStr);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId || !planId || !productId) {
      setFormError('Please select a customer, subscription plan, and product.');
      return;
    }

    if (selectedPlan && qty < selectedPlan.minimumQuantity) {
      setFormError(`This plan requires a minimum quantity of ${selectedPlan.minimumQuantity}.`);
      return;
    }

    if (expiryDate < startDate) {
      setFormError('Expiry date cannot be before start date.');
      return;
    }

    const res = onAddSubscription({
      customerId: Number(customerId),
      planId: Number(planId),
      productId: Number(productId),
      variantId: variantId ? Number(variantId) : undefined,
      quantity: qty,
      taxRate: tr,
      paymentTermsDays: parseInt(paymentTermsDays, 10) || 7,
      startDate,
      expiryDate,
    });

    if (res.ok) {
      setIsModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to create subscription.');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const styles: Record<SubscriptionStatus, string> = {
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Quotation: 'bg-blue-100 text-blue-800 border-blue-200',
      Confirmed: 'bg-amber-100 text-amber-800 border-amber-200',
      Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Paused: 'bg-orange-100 text-orange-800 border-orange-200',
      Closed: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return (
      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscriptions Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Active contracts, quotations, renewals, and subscription lifecycles
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          disabled={customers.length === 0 || plans.length === 0 || products.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Subscription</span>
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Subscription</th>
                <th className="py-3.5 px-5">Customer</th>
                <th className="py-3.5 px-5">Plan & Frequency</th>
                <th className="py-3.5 px-5">Lines & Product</th>
                <th className="py-3.5 px-5">Period</th>
                <th className="py-3.5 px-5 text-right">Total</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No subscriptions yet. Click '+ New Subscription' to begin.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-5">
                      <div className="font-mono font-bold text-slate-900">
                        {sub.subscriptionNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Terms: {sub.paymentTermsDays} days
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{sub.customerName}</div>
                      <div className="text-xs text-slate-400">{sub.customerEmail}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-medium text-slate-800">{sub.planName}</div>
                      <div className="text-xs text-blue-600 capitalize font-semibold">
                        {sub.billingFrequency}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {sub.lines.map((l) => (
                        <div key={l.id} className="text-xs">
                          <span className="font-medium text-slate-800">
                            {l.quantity}x {l.productName}
                          </span>
                          {l.variantName && (
                            <span className="text-slate-400 block text-[11px]">
                              ({l.variantName})
                            </span>
                          )}
                        </div>
                      ))}
                    </td>

                    <td className="py-4 px-5 text-xs font-mono text-slate-600">
                      <div>Start: {sub.startDate}</div>
                      <div>End: {sub.expiryDate}</div>
                    </td>

                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                      ${sub.totalAmount.toFixed(2)}
                    </td>

                    <td className="py-4 px-5 text-center">{getStatusBadge(sub.status)}</td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {sub.status === 'Draft' && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Quotation')}
                            title="Send Quotation to customer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200"
                          >
                            <Send className="w-3 h-3" />
                            <span>Quotation</span>
                          </button>
                        )}

                        {sub.status === 'Quotation' && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Confirmed')}
                            title="Confirm Quotation"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Confirm</span>
                          </button>
                        )}

                        {sub.status === 'Confirmed' && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Active')}
                            title="Activate Subscription"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            <Play className="w-3 h-3" />
                            <span>Activate</span>
                          </button>
                        )}

                        {sub.status === 'Active' && sub.allowPause !== false && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Paused')}
                            title="Pause Subscription"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-orange-50 text-orange-800 hover:bg-orange-100 rounded-lg border border-orange-200"
                          >
                            <Pause className="w-3 h-3" />
                            <span>Pause</span>
                          </button>
                        )}

                        {sub.status === 'Paused' && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Active')}
                            title="Resume Subscription"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200"
                          >
                            <Play className="w-3 h-3" />
                            <span>Resume</span>
                          </button>
                        )}

                        {(sub.status === 'Active' || sub.status === 'Paused') && (
                          <button
                            onClick={() => onUpdateStatus(sub.id, 'Closed')}
                            title="Close Subscription"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Close</span>
                          </button>
                        )}

                        {sub.status === 'Closed' && sub.allowRenewal !== false && (
                          <button
                            onClick={() => onRenewSubscription(sub.id)}
                            title="Renew Subscription (+1 Year)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Renew</span>
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

      {/* New Subscription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Create New Subscription</h3>
                <p className="text-xs text-slate-500">
                  Bind customer account with plan, products, and automatic renewal terms
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

              {/* Customer & Plan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Customer *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subscription Plan *
                  </label>
                  <select
                    required
                    value={planId}
                    onChange={(e) => {
                      const newId = Number(e.target.value);
                      setPlanId(newId);
                      const p = plans.find((pl) => pl.id === newId);
                      if (p && parseInt(quantity, 10) < p.minimumQuantity) {
                        setQuantity(String(p.minimumQuantity));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.price.toFixed(2)} / {p.billingFrequency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product & Variant */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Item *
                  </label>
                  <select
                    required
                    value={productId}
                    onChange={(e) => {
                      setProductId(Number(e.target.value));
                      setVariantId('');
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.salesPrice.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Variant (Optional)
                  </label>
                  <select
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Base Product (Standard)</option>
                    {selectedProduct?.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variantName} (+${v.extraPrice.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity, Tax & Terms */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min={selectedPlan ? selectedPlan.minimumQuantity : 1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                  {selectedPlan && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Min: {selectedPlan.minimumQuantity}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tax Rate (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    required
                    value={paymentTermsDays}
                    onChange={(e) => setPaymentTermsDays(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Price Calculation Summary Box */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="flex justify-between font-medium">
                  <span>Recurring Plan Fee ({selectedPlan?.billingFrequency}):</span>
                  <span className="font-mono">${planPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>
                    Product Line ({qty} × ${unitPrice.toFixed(2)}):
                  </span>
                  <span className="font-mono">${productSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Estimated Tax ({taxRate}%):</span>
                  <span className="font-mono">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-blue-900 pt-2 border-t border-blue-200">
                  <span>Total Recurring Amount:</span>
                  <span className="font-mono">${totalAmount.toFixed(2)}</span>
                </div>
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
                  Create Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
