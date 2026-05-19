import { useEffect, useState, useMemo } from 'react';
import { fetchProductsWithRelations, fetchSales, fetchCategories } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { formatCurrency, cn, exportToExcel } from '../lib/utils';
import type { Product, Sale, Category } from '../lib/types';
import { BarChart3, TrendingUp, Package, Download } from 'lucide-react';

export default function Reports() {
  const { tenantId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function load() {
      if (!tenantId) { setProducts([]); setSales([]); setCategories([]); setLoading(false); return; }
      try {
        const [prods, salesData, cats] = await Promise.all([
          fetchProductsWithRelations(tenantId),
          fetchSales(tenantId),
          fetchCategories(tenantId),
        ]);
        setProducts([...prods].sort((a, b) => Number(b.retail_price) - Number(a.retail_price)));
        setSales(salesData);
        setCategories(cats);
      } catch { setProducts([]); setSales([]); setCategories([]); }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const categoryReports = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.category_id === cat.id);
      const catSales = sales.filter((s) => catProducts.some((p) => p.id === s.product_id));
      const totalRevenue = catSales.reduce((s, sale) => s + Number(sale.total_amount), 0);
      const totalCOGS = catSales.reduce((s, sale) => s + (Number(sale.products?.wholesale_cost || 0) * sale.quantity), 0);
      const realizedProfit = totalRevenue - totalCOGS;
      const totalUnits = catSales.reduce((s, sale) => s + sale.quantity, 0);
      const totalStock = catProducts.reduce((s, p) => s + p.stock_quantity, 0);
      const totalCostBasis = catProducts.reduce((s, p) => s + Number(p.wholesale_cost) * p.stock_quantity, 0);
      const salesVelocity = catSales.length > 0 ? totalUnits / 90 : 0;
      return { id: cat.id, name: cat.name, productCount: catProducts.length, totalRevenue, totalCOGS, realizedProfit, totalUnits, totalStock, totalCostBasis, salesVelocity, lowStock: catProducts.filter((p) => p.stock_quantity <= p.reorder_level).length, products: catProducts };
    }).filter((r) => r.productCount > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products, sales, categories]);

  const filtered = selectedCategory === 'all' ? categoryReports : categoryReports.filter((r) => r.id === selectedCategory);
  const totalRevenue = categoryReports.reduce((s, r) => s + r.totalRevenue, 0);
  const totalCOGS = categoryReports.reduce((s, r) => s + r.totalCOGS, 0);
  const totalRealizedProfit = totalRevenue - totalCOGS;
  const totalCostBasis = categoryReports.reduce((s, r) => s + r.totalCostBasis, 0);

  const handleExportExcel = () => {
    const saleRows = sales.map((s) => ({
      Product: s.products?.name || 'Unknown',
      'Quantity Sold': s.quantity,
      'Actual Sale Price': Number(s.unit_price),
      'Total Revenue': Number(s.total_amount),
      'Cost Price': Number(s.products?.wholesale_cost || 0),
      'Cost of Goods Sold': Number(s.products?.wholesale_cost || 0) * s.quantity,
      'Realized Profit': Number(s.total_amount) - (Number(s.products?.wholesale_cost || 0) * s.quantity),
      Channel: s.channel,
      'Customer Type': s.customer_type,
      'Sale Date': s.sale_date ? new Date(s.sale_date).toLocaleDateString() : '',
    }));
    exportToExcel(saleRows, `phonevault-sales-report-${new Date().toISOString().split('T')[0]}`);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><DollarSign className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p><p className="text-xs text-slate-500">Realized Revenue</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center"><Package className="w-5 h-5 text-teal-600" /></div><div><p className="text-xl font-bold text-slate-900">{formatCurrency(totalCostBasis)}</p><p className="text-xs text-slate-500">Inventory Cost Basis</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className={cn('w-10 h-10 rounded-lg ring-1 flex items-center justify-center', totalRealizedProfit >= 0 ? 'bg-emerald-50 ring-emerald-200' : 'bg-red-50 ring-red-200')}><TrendingUp className={cn('w-5 h-5', totalRealizedProfit >= 0 ? 'text-emerald-600' : 'text-red-600')} /></div><div><p className="text-xl font-bold text-slate-900">{formatCurrency(totalRealizedProfit)}</p><p className="text-xs text-slate-500">Realized Profit (COGS: {formatCurrency(totalCOGS)})</p></div></div>
      </div>

      {/* Export Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">Export Sales Report</p>
          <p className="text-xs text-slate-500">Download all sales with actual prices, cost of goods sold, and realized profit as a CSV file (Excel compatible)</p>
        </div>
        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
          <Download className="w-4 h-4" /> Export to Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedCategory('all')} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>All Categories</button>
          {categories.map((cat) => <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors', selectedCategory === cat.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{cat.name}</button>)}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((report) => {
          const maxRev = categoryReports[0]?.totalRevenue || 1;
          const revPct = (report.totalRevenue / maxRev) * 100;
          return (
            <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4"><div><h3 className="text-base font-semibold text-slate-900">{report.name}</h3><p className="text-xs text-slate-500">{report.productCount} products &middot; {report.lowStock} low stock</p></div><div className="text-right"><p className="text-lg font-bold text-slate-900">{formatCurrency(report.totalRevenue)}</p><p className="text-xs text-slate-500">Revenue</p></div></div>
              <div className="mb-5"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${revPct}%` }} /></div></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                <MetricBox label="Revenue" value={formatCurrency(report.totalRevenue)} />
                <MetricBox label="COGS" value={formatCurrency(report.totalCOGS)} />
                <MetricBox label="Realized Profit" value={formatCurrency(report.realizedProfit)} highlight={report.realizedProfit >= 0} />
                <MetricBox label="Units Sold" value={report.totalUnits.toString()} />
                <MetricBox label="In Stock" value={report.totalStock.toString()} />
                <MetricBox label="Cost Basis" value={formatCurrency(report.totalCostBasis)} />
                <MetricBox label="Velocity" value={`${report.salesVelocity.toFixed(1)}/day`} />
              </div>
              {report.products.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Product Breakdown</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm"><thead><tr className="text-left border-b border-slate-100"><th className="pb-2 font-medium text-slate-500">Product</th><th className="pb-2 font-medium text-slate-500 text-right">Cost</th><th className="pb-2 font-medium text-slate-500 text-right">Target</th><th className="pb-2 font-medium text-slate-500 text-right">Stock</th><th className="pb-2 font-medium text-slate-500 text-right">Cost Basis</th></tr></thead>
                      <tbody>{report.products.map((p) => {
                        const costBasis = Number(p.wholesale_cost) * p.stock_quantity;
                        return <tr key={p.id} className="border-b border-slate-50 last:border-0"><td className="py-2 font-medium text-slate-900">{p.brand} {p.model || p.name}</td><td className="py-2 text-right text-slate-700">{formatCurrency(Number(p.wholesale_cost))}</td><td className="py-2 text-right text-slate-500">{Number(p.retail_price) > 0 ? formatCurrency(Number(p.retail_price)) : '--'}</td><td className="py-2 text-right text-slate-700">{p.stock_quantity}</td><td className="py-2 text-right font-medium text-slate-900">{formatCurrency(costBasis)}</td></tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No reports available</p></div>}
      </div>
    </div>
  );
}

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">{label}</p><p className={cn('text-sm font-bold', highlight ? 'text-emerald-600' : 'text-slate-900')}>{value}</p></div>;
}

function DollarSign(props: React.SVGProps<SVGSVGElement>) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
