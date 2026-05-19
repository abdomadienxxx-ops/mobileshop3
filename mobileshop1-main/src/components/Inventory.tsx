import { useEffect, useState } from 'react';
import { fetchCategories, fetchProductsWithRelations, createProduct, resolveCategoryId, updateProductStock, updateProduct, removeProduct } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { useAppNavigation } from '../lib/navigation';
import { formatCurrency, formatDateTime, stockStatus, cn, profitMargin, profitMarginColor } from '../lib/utils';
import type { Product, Category } from '../lib/types';
import { Search, Filter, ChevronDown, Package, AlertTriangle, CheckCircle, Calculator, Plus, X, Pencil, Boxes, Trash2, Camera, QrCode, Printer } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import BarcodeScanner from './BarcodeScanner';

export default function Inventory() {
  const { tenantId } = useAuth();
  const { consumeInventoryFilters, bumpDataRefresh, inventoryFilterVersion } = useAppNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formTargetPrice, setFormTargetPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState('');
  const [adjustDelta, setAdjustDelta] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editRetail, setEditRetail] = useState('');
  const [editReorder, setEditReorder] = useState('');
  const [rowError, setRowError] = useState('');
  const [rowSaving, setRowSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);

  useEffect(() => {
    const filters = consumeInventoryFilters();
    if (filters?.stockFilter) setStockFilter(filters.stockFilter);
    if (filters?.categoryId) setCategoryFilter(filters.categoryId);
  }, [inventoryFilterVersion, consumeInventoryFilters]);

  async function loadProducts() {
    if (!tenantId) { setLoading(false); return; }
    try {
      const [prods, cats] = await Promise.all([
        fetchProductsWithRelations(tenantId),
        fetchCategories(tenantId),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, [tenantId]);

  const filtered = products.filter((p) => {
    const catName = p.categories?.name?.toLowerCase() || '';
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.model.toLowerCase().includes(search.toLowerCase()) || catName.includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category_id === categoryFilter;
    const status = stockStatus(p.stock_quantity, p.reorder_level);
    const matchStock = stockFilter === 'all' || (stockFilter === 'low' && status.label === 'Low Stock') || (stockFilter === 'out' && status.label === 'Out of Stock') || (stockFilter === 'ok' && (status.label === 'Adequate' || status.label === 'Well Stocked'));
    return matchSearch && matchCat && matchStock;
  });

  const totalCost = products.reduce((s, p) => s + Number(p.wholesale_cost) * p.stock_quantity, 0);
  const totalItems = products.reduce((s, p) => s + p.stock_quantity, 0);
  const lowStock = products.filter((p) => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0).length;
  const outOfStock = products.filter((p) => p.stock_quantity === 0).length;

  function resetForm() {
    setFormName(''); setFormBrand(''); setFormCategory(''); setFormCostPrice(''); setFormTargetPrice(''); setFormQuantity(''); setFormSerial(''); setAddError('');
  }

  async function findOrCreateCategory(categoryName: string): Promise<string | null> {
    if (!tenantId) return null;
    const existing = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;
    return resolveCategoryId(tenantId, categoryName);
  }

  function closeRowActions() {
    setAdjustingId(null);
    setEditingId(null);
    setStockInput('');
    setAdjustDelta('');
    setRowError('');
  }

  function startAdjustStock(p: Product) {
    setEditingId(null);
    setAdjustingId(p.id);
    setStockInput(String(p.stock_quantity));
    setAdjustDelta('');
    setRowError('');
  }

  function startEdit(p: Product) {
    setAdjustingId(null);
    setEditingId(p.id);
    setEditName(p.name);
    setEditBrand(p.brand);
    setEditCost(String(p.wholesale_cost));
    setEditRetail(String(p.retail_price));
    setEditReorder(String(p.reorder_level));
    setRowError('');
  }

  async function handleSaveStock(p: Product) {
    setRowError('');
    const newQty = parseInt(stockInput, 10);
    if (Number.isNaN(newQty) || newQty < 0) {
      setRowError('Enter a valid stock count (0 or more).');
      return;
    }
    setRowSaving(true);
    try {
      const { error } = await updateProductStock(p.id, newQty);
      if (error) throw new Error(error.message);
      closeRowActions();
      await loadProducts();
      bumpDataRefresh();
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : 'Failed to update stock.');
    } finally {
      setRowSaving(false);
    }
  }

  async function handleApplyDelta(p: Product) {
    setRowError('');
    const delta = parseInt(adjustDelta, 10);
    if (Number.isNaN(delta) || adjustDelta.trim() === '') {
      setRowError('Enter units to add (+) or remove (-).');
      return;
    }
    const newQty = p.stock_quantity + delta;
    if (newQty < 0) {
      setRowError(`Cannot remove ${Math.abs(delta)} units — only ${p.stock_quantity} in stock.`);
      return;
    }
    setStockInput(String(newQty));
    setAdjustDelta('');
  }

  async function handleSaveEdit(p: Product) {
    setRowError('');
    const cost = parseFloat(editCost);
    const retail = parseFloat(editRetail);
    const reorder = parseInt(editReorder, 10);
    if (!editName.trim() || !editBrand.trim()) {
      setRowError('Name and brand are required.');
      return;
    }
    if (Number.isNaN(cost) || cost < 0) {
      setRowError('Enter a valid cost price.');
      return;
    }
    if (Number.isNaN(retail) || retail < 0) {
      setRowError('Enter a valid retail price.');
      return;
    }
    if (Number.isNaN(reorder) || reorder < 0) {
      setRowError('Enter a valid reorder level.');
      return;
    }
    setRowSaving(true);
    try {
      const { error } = await updateProduct(p.id, {
        name: editName.trim(),
        brand: editBrand.trim(),
        wholesale_cost: cost,
        retail_price: retail,
        reorder_level: reorder,
      });
      if (error) throw new Error(error.message);
      closeRowActions();
      await loadProducts();
      bumpDataRefresh();
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setRowSaving(false);
    }
  }

  async function handleDeleteItem(p: Product) {
    setRowError('');
    setRowSaving(true);
    try {
      const { error } = await removeProduct(p.id);
      if (error) throw new Error(error.message);
      setDeleteConfirmId(null);
      setExpandedProduct(null);
      closeRowActions();
      await loadProducts();
      bumpDataRefresh();
    } catch (err: unknown) {
      setRowError(err instanceof Error ? err.message : 'Failed to delete item.');
    } finally {
      setRowSaving(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    if (!tenantId) { setAddError('Store session not available. Please sign in again.'); return; }
    const cost = parseFloat(formCostPrice) || 0;
    const target = parseFloat(formTargetPrice) || 0;
    const qty = parseInt(formQuantity) || 0;
    if (!formName.trim()) { setAddError('Product name is required.'); return; }
    if (!formBrand.trim()) { setAddError('Brand is required.'); return; }
    if (!formCategory.trim()) { setAddError('Category is required.'); return; }
    if (cost <= 0 || qty <= 0) { setAddError('Cost price and quantity must be greater than 0.'); return; }
    if (target < 0) { setAddError('Target retail price cannot be negative.'); return; }
    setSaving(true);
    try {
      const categoryId = await findOrCreateCategory(formCategory.trim());
      if (!categoryId) { setAddError('Failed to create or find category.'); setSaving(false); return; }
      const slug = formName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sku = `${formBrand.substring(0, 3).toUpperCase()}-${slug.substring(0, 12).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const specs: Record<string, unknown> = {};
      if (formSerial.trim()) specs.serial_number = formSerial.trim();
      const { error } = await createProduct(tenantId, {
        name: formName.trim(), brand: formBrand.trim(), model: '', sku,
        category_id: categoryId, supplier_id: '',
        wholesale_cost: cost, retail_price: target,
        stock_quantity: qty, reorder_level: Math.max(3, Math.round(qty * 0.15)),
        specs, release_date: null, discontinued: false, image_url: '',
      });
      if (error) throw new Error(error.message);
      setShowAddForm(false);
      resetForm();
      await loadProducts();
      bumpDataRefresh();
    } catch (err: any) {
      setAddError(err.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Inventory Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-cyan-600" />
          <h3 className="font-semibold text-slate-900">Inventory Summary</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Total Items in Stock</p><p className="text-lg font-bold text-slate-900">{totalItems.toLocaleString()}</p></div>
          <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Total Cost Basis</p><p className="text-lg font-bold text-slate-900">{formatCurrency(totalCost)}</p></div>
          <div className="bg-cyan-50 rounded-lg p-3"><p className="text-xs text-cyan-600">Products</p><p className="text-lg font-bold text-cyan-700">{products.length}</p></div>
          <div className="bg-amber-50 rounded-lg p-3"><p className="text-xs text-amber-600">Low / Out of Stock</p><p className="text-lg font-bold text-amber-700">{lowStock} / {outOfStock}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><Package className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{products.length}</p><p className="text-xs text-slate-500">Total Products</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-slate-900">{lowStock}</p><p className="text-xs text-slate-500">Low Stock</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 ring-1 ring-red-200 flex items-center justify-center"><Package className="w-5 h-5 text-red-600" /></div><div><p className="text-xl font-bold text-slate-900">{outOfStock}</p><p className="text-xs text-slate-500">Out of Stock</p></div></div>
      </div>

      {/* Filters + Add Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search products, brands, SKUs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'ok', 'low', 'out'] as const).map((f) => (
              <button key={f} onClick={() => setStockFilter(f)} className={cn('px-3 py-2 text-xs font-medium rounded-lg transition-colors', stockFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {f === 'all' ? 'All' : f === 'ok' ? 'In Stock' : f === 'low' ? 'Low' : 'Out'}
              </button>
            ))}
          </div>
          <button onClick={() => { resetForm(); setShowAddForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add New Item
          </button>
        </div>
      </div>

      {/* Add New Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Add New Item</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              {addError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{addError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. iPhone 17 Pro Case" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Brand *</label>
                <input type="text" required value={formBrand} onChange={(e) => setFormBrand(e.target.value)} placeholder="e.g. Apple, Samsung, Spigen" list="brand-suggestions" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                <datalist id="brand-suggestions">{[...new Set(products.map((p) => p.brand))].map((b) => <option key={b} value={b} />)}</datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                <input type="text" required value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. Covers, Screen Protectors, Chargers" list="category-suggestions" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                <datalist id="category-suggestions">{categories.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                <p className="text-xs text-slate-400 mt-1">Type any category name. New categories are created automatically.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input type="number" required min="0.01" step="0.01" value={formCostPrice} onChange={(e) => setFormCostPrice(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Retail Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input type="number" min="0" step="0.01" value={formTargetPrice} onChange={(e) => setFormTargetPrice(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity *</label>
                  <input type="number" required min="1" step="1" value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} placeholder="0" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">IMEI / Serial Number</label>
                <div className="flex gap-2">
                  <input type="text" value={formSerial} onChange={(e) => setFormSerial(e.target.value)} placeholder="Optional serial or IMEI for tracking" className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 ring-1 ring-cyan-200 transition-colors shrink-0">
                    <Camera className="w-4 h-4" /> Scan
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">Cost Price is what you paid. Target Retail is your intended selling price. Actual profit is calculated when you log a sale.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{saving ? 'Saving...' : 'Save Item'}</button>
              </div>
            </form>
            {showScanner && (
              <BarcodeScanner
                onScan={(val) => setFormSerial(val)}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-2">
        {filtered.map((p) => {
          const status = stockStatus(p.stock_quantity, p.reorder_level);
          const itemCost = Number(p.wholesale_cost) * p.stock_quantity;
          const expanded = expandedProduct === p.id;
          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
              <button
                onClick={() => {
                  if (expanded) {
                    setExpandedProduct(null);
                    closeRowActions();
                  } else {
                    setExpandedProduct(p.id);
                    closeRowActions();
                  }
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.brand} {p.model || p.name}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
                    {p.discontinued && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Discontinued</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{p.sku} &middot; {p.categories?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(Number(p.wholesale_cost))}</p>
                  <p className="text-xs text-slate-500">cost/unit</p>
                </div>
                {Number(p.retail_price) > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-500">{formatCurrency(Number(p.retail_price))}</p>
                    <p className="text-xs text-slate-400">target</p>
                  </div>
                )}
                <div className="text-right shrink-0 w-16">
                  <p className="text-sm font-semibold text-slate-900">{p.stock_quantity}</p>
                  <p className="text-xs text-slate-500">units</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => startAdjustStock(p)} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', adjustingId === p.id ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 ring-1 ring-cyan-200')}>
                      <Boxes className="w-3.5 h-3.5" /> Adjust Stock
                    </button>
                    <button type="button" onClick={() => startEdit(p)} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', editingId === p.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button type="button" onClick={() => setQrProduct(p)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 ring-1 ring-purple-200 transition-colors">
                      <QrCode className="w-3.5 h-3.5" /> QR
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirmId(p.id); setRowError(''); closeRowActions(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 ring-1 ring-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Item
                    </button>
                  </div>
                  {deleteConfirmId === p.id && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                      <p className="text-sm text-red-800 font-medium">Are you sure you want to permanently delete this item?</p>
                      <p className="text-xs text-red-700">{p.brand} {p.name} will be removed from inventory. This cannot be undone.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleDeleteItem(p)} disabled={rowSaving} className="px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                          {rowSaving ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                  {rowError && (adjustingId === p.id || editingId === p.id || deleteConfirmId === p.id) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{rowError}</div>
                  )}
                  {adjustingId === p.id && (
                    <div className="mt-4 p-4 bg-cyan-50/50 rounded-lg border border-cyan-100 space-y-3">
                      <p className="text-xs font-medium text-slate-700">Update stock for {p.brand} {p.name}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Set stock to (units)</label>
                          <input type="number" min="0" step="1" value={stockInput} onChange={(e) => setStockInput(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" />
                          <p className="text-[10px] text-slate-400 mt-1">Current: {p.stock_quantity} units</p>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Or adjust by (+/- units)</label>
                          <div className="flex gap-2">
                            <input type="number" step="1" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} placeholder="e.g. 10 or -3" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" />
                            <button type="button" onClick={() => handleApplyDelta(p)} className="px-3 py-2 text-xs font-medium rounded-lg border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50 transition-colors shrink-0">Apply</button>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSaveStock(p)} disabled={rowSaving} className="px-4 py-2 bg-cyan-600 text-white text-xs font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors">{rowSaving ? 'Saving...' : 'Save Stock'}</button>
                        <button type="button" onClick={closeRowActions} className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                  {editingId === p.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <p className="text-xs font-medium text-slate-700">Edit product details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs text-slate-500 mb-1">Product name</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Brand</label><input type="text" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Cost price</label><input type="number" min="0" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Target retail price</label><input type="number" min="0" step="0.01" value={editRetail} onChange={(e) => setEditRetail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Reorder level</label><input type="number" min="0" step="1" value={editReorder} onChange={(e) => setEditReorder(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white" /></div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSaveEdit(p)} disabled={rowSaving} className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">{rowSaving ? 'Saving...' : 'Save Changes'}</button>
                        <button type="button" onClick={closeRowActions} className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-white transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <Detail label="Cost Price" value={formatCurrency(Number(p.wholesale_cost))} />
                    <Detail label="Target Retail" value={Number(p.retail_price) > 0 ? formatCurrency(Number(p.retail_price)) : 'Not set'} />
                    <Detail label="Reorder Level" value={`${p.reorder_level} units`} />
                    <Detail label="Release Date" value={p.release_date ? new Date(p.release_date).toLocaleDateString() : 'N/A'} />
                    <Detail label="Added to Inventory" value={formatDateTime(p.created_at)} />
                  </div>
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Inventory Value</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><p className="text-xs text-slate-500">Stock on Hand</p><p className="text-sm font-bold text-slate-900">{p.stock_quantity} units</p></div>
                      <div><p className="text-xs text-slate-500">Total Cost Basis</p><p className="text-sm font-bold text-slate-900">{formatCurrency(itemCost)}</p></div>
                      <div><p className="text-xs text-slate-500">Target Value</p><p className="text-sm font-bold text-slate-500">{Number(p.retail_price) > 0 ? formatCurrency(Number(p.retail_price) * p.stock_quantity) : 'N/A'}</p></div>
                    </div>
                    {Number(p.retail_price) > 0 && Number(p.wholesale_cost) > 0 && (() => {
                      const margin = profitMargin(Number(p.wholesale_cost), Number(p.retail_price));
                      return (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Target Profit Margin</span>
                            <span className={`text-sm font-bold ${profitMarginColor(margin)}`}>{margin.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {p.specs && Object.keys(p.specs).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Specifications</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(p.specs).map(([key, val]) => (
                          <div key={key} className="text-xs"><span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}:</span> <span className="text-slate-700 font-medium">{Array.isArray(val) ? val.join(', ') : String(val)}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.suppliers && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Supplier</p>
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-sm text-slate-700">{p.suppliers.name}</span><span className="text-xs text-slate-500">({p.suppliers.country})</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium text-slate-500 mb-1">No items yet</p>
            <p className="text-sm mb-4">Add your first product to get started</p>
            <button onClick={() => { resetForm(); setShowAddForm(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" /> Add New Item
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setQrProduct(null)}>
          <style>{`@media print{body>*:not(#qr-print-wrap){display:none!important}#qr-print-wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:white}}`}</style>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-slate-900">Product QR Code</h3>
              </div>
              <button onClick={() => setQrProduct(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4" id="qr-print-wrap">
              <div className="bg-white p-4 rounded-xl ring-1 ring-slate-200">
                <QRCode value={qrProduct.sku} size={200} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">{qrProduct.brand} {qrProduct.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {qrProduct.sku}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(Number(qrProduct.retail_price))}</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-slate-900">{value}</p></div>;
}
