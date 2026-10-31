import React, { useState } from 'react';
import { Product } from '../types';
import { Package, Plus, Layers, Tag, DollarSign, FileText, CheckCircle2 } from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'variants'>) => void;
  onAddVariant: (productId: number, variantName: string, extraPrice: number) => { ok: boolean; error?: string };
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onAddProduct,
  onAddVariant,
}) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

  // Product Form
  const [name, setName] = useState('');
  const [productType, setProductType] = useState('Software Service');
  const [salesPrice, setSalesPrice] = useState('49.00');
  const [costPrice, setCostPrice] = useState('15.00');
  const [notes, setNotes] = useState('');

  // Variant Form
  const [variantName, setVariantName] = useState('');
  const [extraPrice, setExtraPrice] = useState('0.00');
  const [variantError, setVariantError] = useState<string | null>(null);

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = parseFloat(salesPrice);
    const cp = parseFloat(costPrice);
    if (!name.trim() || isNaN(sp) || isNaN(cp)) return;

    onAddProduct({
      name: name.trim(),
      productType: productType.trim(),
      salesPrice: Math.max(0, sp),
      costPrice: Math.max(0, cp),
      notes: notes.trim(),
    });

    setName('');
    setNotes('');
    setIsProductModalOpen(false);
  };

  const handleVariantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVariantError(null);
    if (!selectedProductId || !variantName.trim()) return;

    const extra = parseFloat(extraPrice) || 0;
    const res = onAddVariant(Number(selectedProductId), variantName.trim(), Math.max(0, extra));
    if (res.ok) {
      setVariantName('');
      setExtraPrice('0.00');
      setIsVariantModalOpen(false);
    } else {
      setVariantError(res.error || 'Failed to add variant.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products & Catalog</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure items, pricing models, and configurable variants for subscription lines
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (products.length > 0) {
                setSelectedProductId(products[0].id);
              }
              setVariantError(null);
              setIsVariantModalOpen(true);
            }}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl border border-slate-200 transition disabled:opacity-50"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>+ Add Variant</span>
          </button>

          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const margin = product.salesPrice - product.costPrice;
          const marginPct = product.salesPrice > 0 ? (margin / product.salesPrice) * 100 : 0;

          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                    <Tag className="w-3 h-3" />
                    <span>{product.productType}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    PROD-{String(product.id).padStart(3, '0')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-3">{product.name}</h3>

                {product.notes && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.notes}</p>
                )}

                {/* Price Breakdown */}
                <div className="grid grid-cols-2 gap-3 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Sales Price
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      ${product.salesPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Cost Price
                    </span>
                    <span className="text-sm font-semibold text-slate-600 font-mono">
                      ${product.costPrice.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium ml-1">
                      ({marginPct.toFixed(0)}% margin)
                    </span>
                  </div>
                </div>

                {/* Variants Section */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Product Variants ({product.variants.length})</span>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setVariantError(null);
                        setIsVariantModalOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      + Add
                    </button>
                  </div>

                  {product.variants.length === 0 ? (
                    <div className="text-xs text-slate-400 bg-slate-50/60 p-2.5 rounded-lg border border-dashed border-slate-200 text-center">
                      Base SKU only (No variants defined)
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {product.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-50 text-xs border border-slate-200/60"
                        >
                          <span className="font-medium text-slate-700">{v.variantName}</span>
                          <span className="font-mono font-semibold text-blue-700">
                            {v.extraPrice > 0 ? `+$${v.extraPrice.toFixed(2)}` : 'Standard'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                Added {product.createdAt.split('T')[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Add New Product</h3>
                <p className="text-xs text-slate-500">Define a sellable item for subscriptions</p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud Backup"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Product Type *
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Software License">Software License</option>
                  <option value="Infrastructure Service">Infrastructure Service</option>
                  <option value="Support Retainer">Support Retainer</option>
                  <option value="API Integration">API Integration</option>
                  <option value="Consulting Package">Consulting Package</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sales Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cost Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Features, licensing constraints or internal notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Add Product Variant</h3>
                <p className="text-xs text-slate-500">Configure an optional SKU variation</p>
              </div>
              <button
                onClick={() => setIsVariantModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVariantSubmit} className="p-6 space-y-4">
              {variantError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {variantError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Product *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(Number(e.target.value))}
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
                  Variant Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Tier (10 Seats)"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Extra Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={extraPrice}
                  onChange={(e) => setExtraPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Additional fee added to base price</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
                >
                  Save Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
