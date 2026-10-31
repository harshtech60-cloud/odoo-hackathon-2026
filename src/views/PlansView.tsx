import React, { useState } from 'react';
import { BillingFrequency, SubscriptionPlan } from '../types';
import { CalendarDays, Plus, Check, Clock, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';

interface PlansViewProps {
  plans: SubscriptionPlan[];
  onAddPlan: (plan: Omit<SubscriptionPlan, 'id' | 'createdAt'>) => { ok: boolean; error?: string };
}

export const PlansView: React.FC<PlansViewProps> = ({ plans, onAddPlan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('39.00');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('monthly');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [availableFrom, setAvailableFrom] = useState(new Date().toISOString().split('T')[0]);
  const [availableUntil, setAvailableUntil] = useState('');
  const [autoClose, setAutoClose] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const p = parseFloat(price);
    const mq = parseInt(minimumQuantity, 10);

    if (!name.trim()) {
      setFormError('Plan name is required.');
      return;
    }
    if (isNaN(p) || p < 0) {
      setFormError('Enter a valid non-negative plan price.');
      return;
    }
    if (isNaN(mq) || mq < 1) {
      setFormError('Minimum quantity must be at least 1.');
      return;
    }
    if (availableUntil && availableUntil < availableFrom) {
      setFormError('End date cannot be before start date.');
      return;
    }

    const res = onAddPlan({
      name: name.trim(),
      price: p,
      billingFrequency,
      minimumQuantity: mq,
      availableFrom,
      availableUntil: availableUntil || undefined,
      autoClose,
      allowEarlyClose,
      allowPause,
      allowRenewal,
    });

    if (res.ok) {
      setName('');
      setPrice('39.00');
      setAvailableUntil('');
      setIsModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to create plan.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Subscription Plans</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure recurring cadences, minimum order quantities, and lifecycle terms
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
          <span>+ Create Plan</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const freqBadges: Record<BillingFrequency, { label: string; color: string }> = {
            daily: { label: 'Daily', color: 'bg-amber-100 text-amber-800 border-amber-200' },
            weekly: { label: 'Weekly', color: 'bg-purple-100 text-purple-800 border-purple-200' },
            monthly: { label: 'Monthly', color: 'bg-blue-100 text-blue-800 border-blue-200' },
            yearly: { label: 'Yearly', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
          };
          const b = freqBadges[plan.billingFrequency];

          return (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${b.color}`}
                  >
                    {b.label} Plan
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    PLAN-{String(plan.id).padStart(3, '0')}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mt-3">{plan.name}</h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    / {plan.billingFrequency === 'yearly' ? 'year' : plan.billingFrequency.replace('ly', '')}
                  </span>
                </div>

                {/* Plan rules */}
                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Minimum Quantity:</span>
                    <span className="font-semibold text-slate-800">{plan.minimumQuantity} unit(s)</span>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Availability:</span>
                    <span className="font-mono text-slate-700">
                      From {plan.availableFrom} {plan.availableUntil ? `to ${plan.availableUntil}` : '(indefinite)'}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {plan.allowPause && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" /> Pause Allowed
                      </span>
                    )}
                    {plan.allowEarlyClose && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" /> Early Close
                      </span>
                    )}
                    {plan.allowRenewal && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Check className="w-3 h-3 text-emerald-600" /> Auto-Renewal
                      </span>
                    )}
                    {plan.autoClose && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">
                        <Clock className="w-3 h-3" /> Auto-Close on Expiry
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                Created {plan.createdAt.split('T')[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Create Subscription Plan</h3>
                <p className="text-xs text-slate-500">Configure recurring pricing structure</p>
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
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Monthly Starter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Frequency *
                  </label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Minimum Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Available From *
                  </label>
                  <input
                    type="date"
                    required
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Available Until (Optional)
                </label>
                <input
                  type="date"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>

              {/* Policy Checkboxes */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1">Lifecycle Policies</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPause}
                    onChange={(e) => setAllowPause(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow subscription pausing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowEarlyClose}
                    onChange={(e) => setAllowEarlyClose(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow early contract termination/closure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRenewal}
                    onChange={(e) => setAllowRenewal(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Allow subscription renewal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoClose}
                    onChange={(e) => setAutoClose(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Auto-close upon reaching expiry date</span>
                </label>
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
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
