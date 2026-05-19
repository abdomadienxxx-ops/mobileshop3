import { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchSales, fetchProducts, logSale } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { formatCurrency, formatDateTime, nowISO, cn, profitMargin, profitMarginColor } from '../lib/utils';
import { useAppNavigation } from '../lib/navigation';
import type { Sale, Product } from '../lib/types';
import { ShoppingCart, TrendingUp, Search, Store, Plus, X, AlertTriangle, Camera, CheckCircle } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

export default function Sales() {
  const { tenantId } = useAuth();
  const { bumpDataRefresh } = useAppNavigation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showLogSale, setShowLogSale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState('');

  const [saleProductId, setSaleProductId] = useState('');
  const [saleQuantity, setSaleQuantity] = useState('');
  const [saleActualPrice, setSaleActualPrice] = useState('');
  const [saleChannel, setSaleChannel] = useState('in-store');
  const [saleCustomerType, setSaleCustomerType] = useState('retail');
  const [saleSerial, setSaleSerial] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');

  const handleProductScan = useCallback((value: string) => {
    const match = products.find(
      (p) => p.sku.toLowerCase() === value.toLowerCase() || p.id.toLowerCase() === value.toLowerCase()
    );
    if (match) {
      setSaleProductId(match.id);
      setSaleActualPrice(String(match.retail_price));
      setSaleQuantity('1');
      setScanFeedback(`Found: ${match.brand} ${match.name}`);
    } else {
      setScanFeedback(`No product matches barcode "${value}"`);
    }
    setTimeout(() => setScanFeedback(''), 4000);
  }, [products]);

  async function loadData() {
    if (!tenantId) { setSales([]); setProducts([]); setLoading(false); return; }
    try {
      const [salesData, prodData] = await Promise.all([
        fetchSales(tenantId),
        fetchProducts(tenantId),
      ]);
      setSales(salesData);
      setProducts(prodData);
    } catch { setSales([]); setProducts([]); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [tenantId]);

  const filtered = sales.filter((s) => {
    const name = s.products?.name || '';
    const brand = s.products?.brand || '';
    const matchSearch = name.toLowerCase().includes(search.toLowerCase()) || brand.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'all' || s.channel === channelFilter;
    const matchType = typeFilter === 'all' || s.customer_type === typeFilter;
    return matchSearch && matchChannel && matchType;
  });

  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s, sale) => s + Number(sale.total_amount), 0);
    const totalUnits = filtered.reduce((s, sale) => s + sale.quantity, 0);
    const totalCost = filtered.reduce((s, sale) => s + (Number(sale.products?.wholesale_cost || 0) * sale.quantity), 0);
    const realizedProfit = totalRevenue - totalCost;
    const avgOrderValue = filtered.length > 0 ? totalRevenue / filtered.length : 0;
    const channels = new Set(filtered.map((s) => s.channel)).size;
    return { totalRevenue, totalUnits, totalCost, realizedProfit, avgOrderValue, channels };
  }, [filtered]);

  const channelBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filtered.forEach((s) => { if (!map[s.channel]) map[s.channel] = { revenue: 0, count: 0 }; map[s.channel].revenue += Number(s.total_amount); map[s.channel].count += 1; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filtered]);

  const customerBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; count: number }> = {};
    filtered.forEach((s) => { if (!map[s.customer_type]) map[s.customer_type] = { revenue: 0, count: 0 }; map[s.customer_type].revenue += Number(s.total_amount); map[s.customer_type].count += 1; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filtered]);

  const productVelocity = useMemo(() => {
    const map: Record<string, { name: string; brand: string; totalQty: number; totalRev: number }> = {};
    sales.forEach((s) => { const pid = s.product_id; if (!map[pid]) map[pid] = { name: s.products?.name || 'Unknown', brand: s.products?.brand || '', totalQty: 0, totalRev: 0 }; map[pid].totalQty += s.quantity; map[pid].totalRev += Number(s.total_amount); });
    return Object.values(map).sort((a, b) => b.totalRev - a.totalRev).slice(0, 10);
  }, [sales]);

  const inStockProducts = products.filter((p) => p.stock_quantity > 0);
  const selectedProduct = products.find((p) => p.id === saleProductId);

  function resetSaleForm() {
    setSaleProductId(''); setSaleQuantity(''); setSaleActualPrice(''); setSaleChannel('in-store'); setSaleCustomerType('retail'); setSaleSerial(''); setSaleError('');
  }

  async function handleLogSale(e: React.FormEvent) {
    e.preventDefault();
    setSaleError('');
    if (!tenantId || !saleProductId) { setSaleError('Please select a product.'); return; }
    const qty = parseInt(saleQuantity) || 0;
    const actualPrice = parseFloat(saleActualPrice) || 0;
    if (qty <= 0) { setSaleError('Quantity must be at least 1.'); return; }
    if (actualPrice <= 0) { setSaleError('Actual sale price must be greater than 0.'); return; }
    if (!selectedProduct) { setSaleError('Product not found.'); return; }
    if (qty > selectedProduct.stock_quantity) { setSaleError(`Only ${selectedProduct.stock_quantity} units in stock. Cannot sell ${qty}.`); return; }
    setSaving(true);
    try {
      const totalAmount = actualPrice * qty;

      const newStock = selectedProduct.stock_quantity - qty;
      const { error: saleErr } = await logSale(
        tenantId,
        {
          product_id: saleProductId,
          quantity: qty,
          unit_price: actualPrice,
          total_amount: totalAmount,
          sale_date: nowISO(),
          channel: saleChannel,
          customer_type: saleCustomerType,
          serial_number: saleSerial.trim() || undefined,
        },
        newStock
      );
      if (saleErr) throw new Error(saleErr.message);

      setShowLogSale(false);
      resetSaleForm();
      await loadData();
      bumpDataRefresh();
    } catch (err: any) {
      setSaleError(err.message || 'Failed to log sale.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={DollarSign} label="Realized Revenue" value={formatCurrency(stats.totalRevenue)} color="cyan" />
        <StatCard icon={ShoppingCart} label="Units Sold" value={stats.totalUnits.toString()} color="teal" />
        <StatCard icon={TrendingUp} label="Realized Profit" value={formatCurrency(stats.realizedProfit)} color={stats.realizedProfit >= 0 ? 'emerald' : 'red'} />
        <StatCard icon={DollarSign} label="Avg Order Value" value={formatCurrency(stats.avgOrderValue)} color="blue" />
        <StatCard icon={Store} label="Sales Channels" value={stats.channels.toString()} color="amber" />
      </div>

      {/* Log a Sale Button */}
      <div className="flex justify-end">
        <button onClick={() => { resetSaleForm(); setShowLogSale(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" /> Log a Sale
        </button>
      </div>

      {/* Log a Sale Modal */}
      {showLogSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLogSale(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Log a Sale</h3>
              <button onClick={() => setShowLogSale(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLogSale} className="p-6 space-y-4">
              {saleError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saleError}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Product *</label>
                <div className="flex gap-2">
                  <select required value={saleProductId} onChange={(e) => { setSaleProductId(e.target.value); setScanFeedback(''); }} className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white">
                    <option value="">Select a product from inventory</option>
                    {inStockProducts.map((p) => <option key={p.id} value={p.id}>{p.brand} {p.model || p.name} ({p.stock_quantity} in stock, cost: {formatCurrency(Number(p.wholesale_cost))})</option>)}
                  </select>
                  <button type="button" onClick={() => setShowProductScanner(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 ring-1 ring-cyan-200 transition-colors shrink-0">
                    <Camera className="w-4 h-4" /> Scan
                  </button>
                </div>
                {inStockProducts.length === 0 && <p className="text-xs text-amber-600 mt-1">No products in stock. Add inventory first.</p>}
                {scanFeedback && (
                  <p className={cn('text-xs mt-1 flex items-center gap-1', scanFeedback.startsWith('Found') ? 'text-emerald-600' : 'text-amber-600')}>
                    <CheckCircle className="w-3 h-3" /> {scanFeedback}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity Sold *</label>
                  <input type="number" required min="1" step="1" value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} placeholder="1" max={selectedProduct?.stock_quantity || undefined} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Actual Sale Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input type="number" required min="0.01" step="0.01" value={saleActualPrice} onChange={(e) => setSaleActualPrice(e.target.value)} placeholder="0.00" className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Channel</label>
                  <select value={saleChannel} onChange={(e) => setSaleChannel(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <option value="in-store">In-Store</option>
                    <option value="online">Online</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Type</label>
                  <select value={saleCustomerType} onChange={(e) => setSaleCustomerType(e.target.value)} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">IMEI / Serial Number</label>
                <div className="flex gap-2">
                  <input type="text" value={saleSerial} onChange={(e) => setSaleSerial(e.target.value)} placeholder="Optional - serial or IMEI of the device" className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                  <button type="button" onClick={() => setShowScanner(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 ring-1 ring-cyan-200 transition-colors shrink-0">
                    <Camera className="w-4 h-4" /> Scan
                  </button>
                </div>
              </div>
              {/* Live profit preview */}
              {selectedProduct && saleQuantity && saleActualPrice && parseFloat(saleActualPrice) > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Cost Price per Unit:</span>
                    <span className="font-medium text-slate-900">{formatCurrency(Number(selectedProduct.wholesale_cost))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Actual Sale Price per Unit:</span>
                    <span className="font-medium text-slate-900">{formatCurrency(parseFloat(saleActualPrice))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Profit/Loss per Unit:</span>
                    <span className={cn('font-bold', (parseFloat(saleActualPrice) - Number(selectedProduct.wholesale_cost)) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency(parseFloat(saleActualPrice) - Number(selectedProduct.wholesale_cost))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-slate-200">
                    <span className="text-slate-700 font-medium">Total Realized Profit/Loss:</span>
                    <span className={cn('font-bold text-base', (parseFloat(saleActualPrice) - Number(selectedProduct.wholesale_cost)) * parseInt(saleQuantity) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency((parseFloat(saleActualPrice) - Number(selectedProduct.wholesale_cost)) * parseInt(saleQuantity))}
                    </span>
                  </div>
                  {(parseFloat(saleActualPrice) - Number(selectedProduct.wholesale_cost)) < 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Selling below cost -- this will record a loss.
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLogSale(false)} className="flex-1 py-2.5 px-4 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{saving ? 'Saving...' : 'Log Sale'}</button>
              </div>
            </form>
            {showScanner && (
              <BarcodeScanner
                onScan={(val) => setSaleSerial(val)}
                onClose={() => setShowScanner(false)}
              />
            )}
            {showProductScanner && (
              <BarcodeScanner
                onScan={handleProductScan}
                onClose={() => setShowProductScanner(false)}
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Channel</h3>
          <div className="space-y-3">{channelBreakdown.map(([ch, data]) => { const maxRev = channelBreakdown[0]?.[1].revenue || 1; return <div key={ch}><div className="flex justify-between text-sm mb-1"><span className="text-slate-700 font-medium capitalize">{ch}</span><span className="text-slate-500">{formatCurrency(data.revenue)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${(data.revenue / maxRev) * 100}%` }} /></div><p className="text-xs text-slate-400 mt-0.5">{data.count} transactions</p></div>; })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">By Customer Type</h3>
          <div className="space-y-3">{customerBreakdown.map(([ct, data]) => { const maxRev = customerBreakdown[0]?.[1].revenue || 1; return <div key={ct}><div className="flex justify-between text-sm mb-1"><span className="text-slate-700 font-medium capitalize">{ct}</span><span className="text-slate-500">{formatCurrency(data.revenue)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${(data.revenue / maxRev) * 100}%` }} /></div><p className="text-xs text-slate-400 mt-0.5">{data.count} transactions</p></div>; })}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Sales Velocity</h3>
          <div className="space-y-2">{productVelocity.map((pv, i) => <div key={i} className="flex items-center gap-3 py-1.5"><span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span><div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{pv.brand} {pv.name}</p><p className="text-xs text-slate-500">{pv.totalQty} units</p></div><span className="text-sm font-semibold text-slate-900">{formatCurrency(pv.totalRev)}</span></div>)}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option value="all">All Channels</option><option value="in-store">In-Store</option><option value="online">Online</option><option value="phone">Phone</option></select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option value="all">All Types</option><option value="retail">Retail</option><option value="wholesale">Wholesale</option><option value="corporate">Corporate</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left"><th className="px-4 py-3 font-medium text-slate-500">Product</th><th className="px-4 py-3 font-medium text-slate-500">Qty</th><th className="px-4 py-3 font-medium text-slate-500">Actual Price</th><th className="px-4 py-3 font-medium text-slate-500">Revenue</th><th className="px-4 py-3 font-medium text-slate-500">Profit/Loss</th><th className="px-4 py-3 font-medium text-slate-500">Channel</th><th className="px-4 py-3 font-medium text-slate-500">Serial/IMEI</th><th className="px-4 py-3 font-medium text-slate-500">Date</th></tr></thead>
            <tbody>{filtered.slice(0, 50).map((s) => {
              const costTotal = Number(s.products?.wholesale_cost || 0) * s.quantity;
              const profit = Number(s.total_amount) - costTotal;
              const margin = s.unit_price > 0 ? profitMargin(Number(s.products?.wholesale_cost || 0), Number(s.unit_price)) : 0;
              return (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.products?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-slate-700">{s.quantity}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(Number(s.unit_price))}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(Number(s.total_amount))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('font-semibold', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${profitMarginColor(margin)} bg-slate-900/5`}>{margin.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{s.channel}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{s.serial_number || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(s.sale_date)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {filtered.length > 50 && <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">Showing 50 of {filtered.length} transactions</div>}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = { cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-200' }, teal: { bg: 'bg-teal-50', icon: 'text-teal-600', ring: 'ring-teal-200' }, blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-200' }, emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-200' }, amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-200' }, red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-200' } };
  const c = colorMap[color] || colorMap.cyan;
  return <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center`}><Icon className={`w-5 h-5 ${c.icon}`} /></div><div><p className="text-xl font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>;
}

function DollarSign(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
