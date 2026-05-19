import { useEffect, useState, useMemo } from 'react';
import { fetchCompetitorPrices, fetchProducts } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { formatCurrency, cn } from '../lib/utils';
import type { CompetitorPrice, Product } from '../lib/types';
import { TrendingUp, TrendingDown, Minus, Search, BarChart3 } from 'lucide-react';

export default function MarketAnalysis() {
  const { tenantId } = useAuth();
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      if (!tenantId) { setCompetitorPrices([]); setProducts([]); setLoading(false); return; }
      try {
        const [cpData, prodData] = await Promise.all([
          fetchCompetitorPrices(tenantId),
          fetchProducts(tenantId, 'retail_price'),
        ]);
        setCompetitorPrices(cpData);
        setProducts(prodData);
      } catch { setCompetitorPrices([]); setProducts([]); }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const competitors = useMemo(() => [...new Set(competitorPrices.map((c) => c.competitor_name))].sort(), [competitorPrices]);

  const productComparison = useMemo(() => {
    const map: Record<string, { product: Product; ourPrice: number; competitors: { name: string; price: number; inStock: boolean; diff: number; diffPct: number }[]; avgCompetitorPrice: number; minPrice: number; maxPrice: number }> = {};
    competitorPrices.forEach((cp) => {
      const pid = cp.product_id;
      if (!map[pid]) { const prod = products.find((p) => p.id === pid); if (!prod) return; map[pid] = { product: prod, ourPrice: Number(prod.retail_price), competitors: [], avgCompetitorPrice: 0, minPrice: Infinity, maxPrice: 0 }; }
      const diff = Number(cp.price) - map[pid].ourPrice;
      const diffPct = map[pid].ourPrice > 0 ? (diff / map[pid].ourPrice) * 100 : 0;
      map[pid].competitors.push({ name: cp.competitor_name, price: Number(cp.price), inStock: cp.in_stock, diff, diffPct });
      map[pid].minPrice = Math.min(map[pid].minPrice, Number(cp.price));
      map[pid].maxPrice = Math.max(map[pid].maxPrice, Number(cp.price));
    });
    Object.values(map).forEach((entry) => { if (entry.competitors.length > 0) entry.avgCompetitorPrice = entry.competitors.reduce((s, c) => s + c.price, 0) / entry.competitors.length; });
    return Object.values(map).sort((a, b) => b.ourPrice - a.ourPrice);
  }, [competitorPrices, products]);

  const filtered = productComparison.filter((pc) => {
    const matchProduct = selectedProduct === 'all' || pc.product.id === selectedProduct;
    const matchSearch = pc.product.name.toLowerCase().includes(search.toLowerCase()) || pc.product.brand.toLowerCase().includes(search.toLowerCase());
    return matchProduct && matchSearch;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{competitors.length}</p><p className="text-xs text-slate-500">Competitors Tracked</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teal-600" /></div><div><p className="text-xl font-bold text-slate-900">{productComparison.length}</p><p className="text-xs text-slate-500">Products Compared</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 ring-1 ring-blue-200 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-blue-600" /></div><div><p className="text-xl font-bold text-slate-900">{competitorPrices.length}</p><p className="text-xs text-slate-500">Price Data Points</p></div></div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option value="all">All Products</option>{products.map((p) => <option key={p.id} value={p.id}>{p.brand} {p.model || p.name}</option>)}</select>
      </div>
      <div className="space-y-4">
        {filtered.map((pc) => {
          const pricePosition = pc.ourPrice <= pc.minPrice ? 'lowest' : pc.ourPrice >= pc.maxPrice ? 'highest' : 'mid';
          return (
            <div key={pc.product.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4"><div><h3 className="text-base font-semibold text-slate-900">{pc.product.brand} {pc.product.model || pc.product.name}</h3><p className="text-xs text-slate-500">{pc.product.sku}</p></div><div className="text-right"><p className="text-lg font-bold text-slate-900">{formatCurrency(pc.ourPrice)}</p><p className="text-xs text-slate-500">Our Price</p></div></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', pricePosition === 'lowest' ? 'bg-emerald-50 text-emerald-700' : pricePosition === 'highest' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>{pricePosition === 'lowest' ? 'Lowest Price' : pricePosition === 'highest' ? 'Highest Price' : 'Competitive'}</span>
                  {pc.avgCompetitorPrice > 0 && <span className="text-xs text-slate-500">Market avg: {formatCurrency(pc.avgCompetitorPrice)}</span>}
                </div>
                {pc.minPrice < Infinity && <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-200 to-teal-200 rounded-lg" style={{ width: '100%' }} /><div className="absolute inset-y-0 w-0.5 bg-slate-900 z-10" style={{ left: `${((pc.ourPrice - pc.minPrice) / (pc.maxPrice - pc.minPrice)) * 100}%` }} /><div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-medium text-slate-600"><span>{formatCurrency(pc.minPrice)}</span><span>{formatCurrency(pc.maxPrice)}</span></div></div>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm"><thead><tr className="text-left border-b border-slate-100"><th className="pb-2 font-medium text-slate-500">Competitor</th><th className="pb-2 font-medium text-slate-500 text-right">Price</th><th className="pb-2 font-medium text-slate-500 text-right">Difference</th><th className="pb-2 font-medium text-slate-500 text-center">Stock</th></tr></thead>
                  <tbody>{pc.competitors.sort((a, b) => a.price - b.price).map((comp) => <tr key={comp.name} className="border-b border-slate-50 last:border-0"><td className="py-2 font-medium text-slate-900">{comp.name}</td><td className="py-2 text-right text-slate-700">{formatCurrency(comp.price)}</td><td className="py-2 text-right"><span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', comp.diff < 0 ? 'text-emerald-600' : comp.diff > 0 ? 'text-red-600' : 'text-slate-500')}>{comp.diff < 0 ? <TrendingDown className="w-3 h-3" /> : comp.diff > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}{comp.diffPct > 0 ? '+' : ''}{comp.diffPct.toFixed(1)}%</span></td><td className="py-2 text-center"><span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', comp.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{comp.inStock ? 'In Stock' : 'Out'}</span></td></tr>)}</tbody></table>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No competitor data available</p></div>}
      </div>
    </div>
  );
}
