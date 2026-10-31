import React, { useState } from 'react';
import { Discount, DiscountType, Product } from '../types';
import {
  Percent,
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface DiscountsViewProps {
  discounts: Discount[];
  products: Product[];
  onAddDiscount: (discountData: Omit<Discount, 'id' | 'createdAt' | 'usedCount' | 'status'>) => {
    ok: boolean;
    error?: string;
  };
  onToggleStatus: (discountId: number) => void;
  onDeleteDiscount: (discountId: number) => { ok: boolean; error?: string };
}

export const DiscountsView: React.FC<DiscountsViewProps> = ({
  discounts,
  products,
  onAddDiscount,
  onToggleStatus,
  onDeleteDiscount,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  // Default end date next year
  const defaultEnd = new Date();
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
  const defaultEndStr = defaultEnd.toISOString().split('T')[0];

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('Percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [minOrderValue, setMinOrderValue] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(defaultEndStr);
  const [usageLimit, setUsageLimit] = useState('');
  const [minQuantity, setMinQuantity] = useState('0');
  const [productId, setProductId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !/^[A-Z0-9_-]+$/.test(cleanCode)) {
      setFormError('Discount code must only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }

    if (discountType === 'Percentage' && val > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    if (endDate < startDate) {
      setFormError('End date cannot be earlier than start date.');
      return;
    }

    const res = onAddDiscount({
      code: cleanCode,
      description: description.trim(),
      discountType,
      discountValue: val,
      minOrderValue: parseFloat(minOrderValue) || 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
      startDate,
      endDate,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
      minQuantity: parseInt(minQuantity, 10) || 0,
      productId: productId ? Number(productId) : undefined,
    });

    if (res.ok) {
      setCode('');
      setDescription('');
      setMaxDiscountAmount('');
      setUsageLimit('');
      setIsModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to add discount.');
    }
  };

  // Stats calculation
  const totalDiscounts = discounts.length;
  const activeDiscounts = discounts.filter(
    (d) =>
      d.status === 'Active' &&
      d.startDate <= todayStr &&
      d.endDate >= todayStr &&
      (d.usageLimit == null || d.usedCount < d.usageLimit)
  ).length;
  const inactiveDiscounts = discounts.filter((d) => d.status === 'Inactive').length;
  const expiredDiscounts = discounts.filter((d) => d.endDate < todayStr).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Rules
          </span>
          <h3 className="text-2xl font-bold text-slate-900 mt-2">{totalDiscounts}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Configured discount rules</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Currently Active
          </span>
          <h3 className="text-2xl font-bold text-emerald-600 mt-2">{activeDiscounts}</h3>
          <p className="text-[11px] text-emerald-700/70 mt-1">Eligible on recurring invoices</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Inactive / Paused
          </span>
          <h3 className="text-2xl font-bold text-slate-600 mt-2">{inactiveDiscounts}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Temporarily disabled</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Expired Rules
          </span>
          <h3 className="text-2xl font-bold text-rose-600 mt-2">{expiredDiscounts}</h3>
          <p className="text-[11px] text-rose-600/70 mt-1">Past validity date</p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Promotional & Recurring Discounts</h3>
            <p className="text-xs text-slate-500">
              Rules evaluated during billing generation to automatically apply best savings
            </p>
          </div>

          <button
            onClick={() => {
              setFormError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Discount</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-5">Code & Description</th>
                <th className="py-3.5 px-5">Benefit</th>
                <th className="py-3.5 px-5">Conditions & Scope</th>
                <th className="py-3.5 px-5">Validity Period</th>
                <th className="py-3.5 px-5 text-center">Usage</th>
                <th className="py-3.5 px-5 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No discount rules configured yet.
                  </td>
                </tr>
              ) : (
                discounts.map((disc) => {
                  const isExpired = disc.endDate < todayStr;
                  const isExhausted = disc.usageLimit != null && disc.usedCount >= disc.usageLimit;
                  const targetProduct = products.find((p) => p.id === disc.productId);

                  return (
                    <tr key={disc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {disc.code}
                          </span>
                        </div>
                        {disc.description && (
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">{disc.description}</p>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          {disc.discountType === 'Percentage'
                            ? `${disc.discountValue}% OFF`
                            : `$${disc.discountValue.toFixed(2)} OFF`}
                        </span>
                        {disc.maxDiscountAmount != null && (
                          <span className="text-[11px] text-slate-400 block">
                            (Capped at ${disc.maxDiscountAmount.toFixed(2)})
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-xs text-slate-600 space-y-0.5">
                        {disc.minOrderValue > 0 && (
                          <div>Min Order: ${disc.minOrderValue.toFixed(2)}</div>
                        )}
                        {disc.minQuantity > 0 && <div>Min Qty: {disc.minQuantity} units</div>}
                        {targetProduct ? (
                          <div className="text-blue-600 font-medium">
                            Scope: {targetProduct.name}
                          </div>
                        ) : (
                          <div className="text-slate-400">Scope: Entire Subscription</div>
                        )}
                      </td>

                      <td className="py-4 px-5 text-xs font-mono text-slate-600">
                        <div>From {disc.startDate}</div>
                        <div>To {disc.endDate}</div>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {disc.usedCount}
                          {disc.usageLimit != null ? ` / ${disc.usageLimit}` : ' (Unlimited)'}
                        </span>
                        {isExhausted && (
                          <span className="block text-[10px] text-rose-600 font-semibold">
                            Limit Reached
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center">
                        {isExpired ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
                            Expired
                          </span>
                        ) : disc.status === 'Active' ? (
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onToggleStatus(disc.id)}
                            title={disc.status === 'Active' ? 'Deactivate' : 'Activate'}
                            className="p-1 text-slate-500 hover:text-blue-600 transition"
                          >
                            {disc.status === 'Active' ? (
                              <ToggleRight className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                            )}
                          </button>

                          {disc.usedCount === 0 && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete unused discount code ${disc.code}?`)) {
                                  onDeleteDiscount(disc.id);
                                }
                              }}
                              title="Delete unused rule"
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Add Discount Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Create Discount Rule</h3>
                <p className="text-xs text-slate-500">
                  Configure promotion code, volume threshold, and validity
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLASH20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Type *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed Amount">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Promotion Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10% welcome discount on subscriptions over $50"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional ceiling cap"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Min Order Subtotal ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Min Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Valid From Date *
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
                    Valid Until Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Usage Limit (Redemptions)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Applicable Product Scope
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">All Products (Whole Order)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        Only {p.name}
                      </option>
                    ))}
                  </select>
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
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
