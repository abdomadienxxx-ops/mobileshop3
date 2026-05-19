import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchProducts, fetchSales, fetchCategories } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { useAppNavigation } from '../lib/navigation';
import { formatCurrency, stockStatus, cn, profitMarginColor, exportToExcel } from '../lib/utils';
import type { Product, Sale, Category } from '../lib/types';
import { ShoppingCart, DollarSign, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Download } from 'lucide-react';

export default function Dashboard() {
  const { tenantId } = useAuth();
  const { navigate, refreshTick } = useAppNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!tenantId) {
      setProducts([]); setSales([]); setCategories([]);
      setLoading(false); return;
    }
    try {
      const [prods, salesData, cats] = await Promise.all([
        fetchProducts(tenantId, 'retail_price'),
        fetchSales(tenantId, 100),
        fetchCategories(tenantId),
      ]);
      setProducts(prods);
      setSales(salesData);
      setCategories(cats);
    } catch {
      setProducts([]); setSales([]); setCategories([]);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData, refreshTick]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenantId}` }, () => { loadData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `tenant_id=eq.${tenantId}` }, () => { loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, loadData]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  const totalRealizedRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalCostOfGoodsSold = sales.reduce((sum, s) => sum + (Number(s.products?.wholesale_cost || 0) * s.quantity), 0);
  const totalRealizedProfit = totalRealizedRevenue - totalCostOfGoodsSold;
  const totalUnitsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalCostBasis = products.reduce((sum, p) => sum + Number(p.wholesale_cost) * p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => {
    const status = stockStatus(p.stock_quantity, p.reorder_level);
    return status.label === 'Low Stock';
  }).length;

  const recentSales = sales.slice(0, 8);
  const topProducts = [...products].sort((a, b) => Number(b.retail_price) - Number(a.retail_price)).slice(0, 5);

  const salesByCategory = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category_id === cat.id);
    const catSales = sales.filter((s) => catProducts.some((p) => p.id === s.product_id));
    const revenue = catSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const cost = catSales.reduce((sum, s) => sum + (Number(s.products?.wholesale_cost || 0) * s.quantity), 0);
    return { id: cat.id, name: cat.name, revenue, profit: revenue - cost, count: catSales.length };
  }).filter((c) => c.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const goSales = () => navigate('sales');
  const goInventory = () => navigate('inventory');
  const goInventoryLow = () => navigate('inventory', { inventory: { stockFilter: 'low' } });
  const goInventoryCategory = (categoryId: string) => navigate('inventory', { inventory: { categoryId } });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Realized Revenue" value={formatCurrency(totalRealizedRevenue)} icon={DollarSign} color="cyan" onClick={goSales} />
        <KPICard title="Units Sold" value={totalUnitsSold.toString()} icon={ShoppingCart} color="teal" onClick={goSales} />
        <KPICard title="Realized Profit" value={formatCurrency(totalRealizedProfit)} icon={totalRealizedProfit >= 0 ? TrendingUp : TrendingDown} color={totalRealizedProfit >= 0 ? 'emerald' : 'red'} onClick={goSales} />
        <KPICard title="Low Stock Items" value={lowStockCount.toString()} icon={AlertTriangle} color={lowStockCount > 3 ? 'amber' : 'emerald'} onClick={goInventoryLow} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            const invRows = products.map(p => ({
              'Product Name': p.name,
              Brand: p.brand,
              Model: p.model,
              SKU: p.sku,
              Category: p.categories?.name || '',
              'Wholesale Cost': Number(p.wholesale_cost),
              'Retail Price': Number(p.retail_price),
              'Stock Quantity': p.stock_quantity,
              'Reorder Level': p.reorder_level,
            }));
            const saleRows = sales.map(s => ({
              'Sale ID': s.id,
              Product: s.products?.name || 'Unknown',
              Quantity: s.quantity,
              'Unit Price': Number(s.unit_price),
              'Total Amount': Number(s.total_amount),
              'Sale Date': s.sale_date,
              Channel: s.channel,
              'Customer Type': s.customer_type,
              'Serial Number': s.serial_number || '',
            }));
            exportToExcel([...invRows, ...saleRows], `phonevault-export-${new Date().toISOString().slice(0, 10)}`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export to CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Realized Revenue" value={formatCurrency(totalRealizedRevenue)} sub={`${totalUnitsSold} units sold`} onClick={goSales} />
          <SummaryCard label="Cost of Goods Sold" value={formatCurrency(totalCostOfGoodsSold)} onClick={goSales} />
          <SummaryCard
            label="Realized Profit"
            value={formatCurrency(totalRealizedProfit)}
            sub={
              totalRealizedRevenue > 0
                ? (() => { const m = (totalRealizedProfit / totalRealizedRevenue) * 100; return <span className={profitMarginColor(m)}>{m.toFixed(1)}% margin</span> })()
                : <span className="text-slate-400">0% margin</span>
            }
            onClick={goSales}
            highlight={totalRealizedProfit >= 0 ? 'emerald' : 'red'}
          />
          <SummaryCard label="Total Stock Value" value={formatCurrency(totalCostBasis)} sub={`${totalStock} items in stock`} onClick={goInventory} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Revenue by Category</h3>
            <button onClick={() => navigate('reports')} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">View Reports <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-3">
            {salesByCategory.map((cat) => {
              const maxRev = salesByCategory[0]?.revenue || 1;
              const pct = (cat.revenue / maxRev) * 100;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => goInventoryCategory(cat.id)}
                  className="w-full text-left rounded-lg p-2 -mx-2 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium group-hover:text-cyan-700">{cat.name}</span>
                    <span className="text-slate-500">{formatCurrency(cat.revenue)} ({cat.count} sales) &middot; <span className={cn(cat.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(cat.profit)} profit</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
            {salesByCategory.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No sales data yet. Log your first sale to see data here.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <MetricRow label="Realized Profit Margin" value={
              totalRealizedRevenue > 0
                ? (() => { const m = (totalRealizedProfit / totalRealizedRevenue) * 100; return <span className={profitMarginColor(m)}>{m.toFixed(1)}%</span> })()
                : <span className="text-slate-400">0%</span>
            } />
            <button type="button" onClick={goInventory} className="w-full text-left rounded-lg hover:bg-slate-50 px-1 py-0.5 transition-colors">
              <MetricRow label="Total Products" value={products.length.toString()} />
            </button>
            <MetricRow label="Categories" value={categories.length.toString()} />
            <button type="button" onClick={goInventory} className="w-full text-left rounded-lg hover:bg-slate-50 px-1 py-0.5 transition-colors">
              <MetricRow label="Total Items in Stock" value={totalStock.toLocaleString()} />
            </button>
            <MetricRow label="Discontinued" value={products.filter(p => p.discontinued).length.toString()} />
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">Stock Health</p>
              <div className="flex gap-2 flex-wrap">
                {products.slice(0, 8).map((p) => {
                  const status = stockStatus(p.stock_quantity, p.reorder_level);
                  return <span key={p.id} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>;
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Top Products by Target Price</h3>
            <button onClick={goInventory} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">All Inventory <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{p.brand} {p.model || p.name}</p>
                  <p className="text-xs text-slate-500">Cost: {formatCurrency(Number(p.wholesale_cost))} &middot; {p.stock_quantity} in stock</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-500">{formatCurrency(Number(p.retail_price))}</p>
                  <p className="text-xs text-slate-400">target</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Sales</h3>
            <button onClick={goSales} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1">All Sales <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2">
            {recentSales.map((s) => {
              const costTotal = Number(s.products?.wholesale_cost || 0) * s.quantity;
              const profit = Number(s.total_amount) - costTotal;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={goSales}
                  className="w-full flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg px-1 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.products?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{s.quantity}x @ {formatCurrency(Number(s.unit_price))} &middot; {s.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(s.total_amount))}</p>
                    <p className={cn('text-xs font-medium', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</p>
                  </div>
                </button>
              );
            })}
            {recentSales.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No sales yet. Log your first sale to see data here.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, onClick }: { title: string; value: string; icon: React.ElementType; color: string; onClick?: () => void }) {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-200' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', ring: 'ring-teal-200' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-200' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-200' },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 text-left w-full transition-all',
        onClick ? 'hover:shadow-md hover:border-cyan-200 cursor-pointer' : 'cursor-default'
      )}
    >
      <div className={`w-10 h-10 rounded-lg ${c.bg} ring-1 ${c.ring} flex items-center justify-center mb-3`}><Icon className={`w-5 h-5 ${c.icon}`} /></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
    </button>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  onClick,
  highlight,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  onClick?: () => void;
  highlight?: 'emerald' | 'red';
}) {
  const bg = highlight === 'emerald' ? 'bg-emerald-50' : highlight === 'red' ? 'bg-red-50' : 'bg-slate-50';
  const labelColor = highlight === 'emerald' ? 'text-emerald-600' : highlight === 'red' ? 'text-red-600' : 'text-slate-500';
  const valueColor = highlight === 'emerald' ? 'text-emerald-700' : highlight === 'red' ? 'text-red-700' : 'text-slate-900';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        `${bg} rounded-lg p-4 text-left w-full transition-all`,
        onClick && 'hover:ring-2 hover:ring-cyan-200 cursor-pointer'
      )}
    >
      <p className={cn('text-xs mb-1', labelColor)}>{label}</p>
      <p className={cn('text-2xl font-bold', valueColor)}>{value}</p>
      {sub && <p className={cn('text-xs mt-1', highlight ? labelColor : 'text-slate-400')}>{sub}</p>}
    </button>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-slate-600">{label}</span><span className="text-sm font-semibold">{value}</span></div>;
}
