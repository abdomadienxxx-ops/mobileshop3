import { useEffect, useState, useMemo } from 'react';
import { fetchForecasts } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { cn, stockStatus } from '../lib/utils';
import type { InventoryForecast } from '../lib/types';
import { BarChart3, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

export default function Forecasting() {
  const { tenantId } = useAuth();
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'reorder' | 'adequate' | 'surplus'>('all');

  useEffect(() => {
    async function load() {
      if (!tenantId) { setForecasts([]); setLoading(false); return; }
      try { setForecasts(await fetchForecasts(tenantId)); } catch { setForecasts([]); }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const enrichedForecasts = useMemo(() => {
    return forecasts.map((fc) => {
      const stockStatusVal = stockStatus(fc.current_stock, fc.products?.reorder_level || 5);
      const margin = fc.products ? ((Number(fc.products.retail_price) - Number(fc.products.wholesale_cost)) / Number(fc.products.retail_price)) * 100 : 0;
      const category = fc.days_of_stock <= 7 ? 'reorder' : fc.days_of_stock <= 30 ? 'adequate' : 'surplus';
      return { ...fc, stockStatus: stockStatusVal, margin, category };
    });
  }, [forecasts]);

  const filtered = enrichedForecasts.filter((fc) => {
    const matchSearch = (fc.products?.name || '').toLowerCase().includes(search.toLowerCase()) || (fc.products?.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || fc.category === filter;
    return matchSearch && matchFilter;
  });

  const reorderCount = enrichedForecasts.filter((f) => f.reorder_recommended).length;
  const criticalCount = enrichedForecasts.filter((f) => f.days_of_stock <= 7).length;
  const avgConfidence = forecasts.length > 0 ? forecasts.reduce((s, f) => s + Number(f.confidence), 0) / forecasts.length : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-red-50 ring-1 ring-red-200 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600" /></div><div><p className="text-xl font-bold text-slate-900">{criticalCount}</p><p className="text-xs text-slate-500">Critical Stock</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-slate-900">{reorderCount}</p><p className="text-xs text-slate-500">Reorder Recommended</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{(avgConfidence * 100).toFixed(0)}%</p><p className="text-xs text-slate-500">Avg Confidence</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xl font-bold text-slate-900">{enrichedForecasts.filter(f => f.category === 'surplus').length}</p><p className="text-xs text-slate-500">Well Stocked</p></div></div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <div className="flex gap-1.5">{(['all', 'reorder', 'adequate', 'surplus'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-2 text-xs font-medium rounded-lg transition-colors', filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>{f === 'all' ? 'All' : f === 'reorder' ? 'Reorder' : f === 'adequate' ? 'Adequate' : 'Surplus'}</button>)}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((fc) => (
          <div key={fc.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3"><div><h3 className="text-sm font-semibold text-slate-900">{fc.products?.brand} {fc.products?.model || fc.products?.name}</h3><p className="text-xs text-slate-500">{fc.products?.sku}</p></div><span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', fc.stockStatus.bg, fc.stockStatus.color)}>{fc.stockStatus.label}</span></div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><p className="text-xs text-slate-500">Current Stock</p><p className="text-lg font-bold text-slate-900">{fc.current_stock}</p></div>
              <div><p className="text-xs text-slate-500">Predicted Demand</p><p className="text-lg font-bold text-slate-900">{fc.predicted_demand}</p></div>
              <div><p className="text-xs text-slate-500">Days of Stock</p><p className={cn('text-lg font-bold', fc.days_of_stock <= 7 ? 'text-red-600' : fc.days_of_stock <= 30 ? 'text-amber-600' : 'text-emerald-600')}>{fc.days_of_stock}</p></div>
            </div>
            <div className="mb-3"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', fc.days_of_stock <= 7 ? 'bg-red-500' : fc.days_of_stock <= 30 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, (fc.current_stock / Math.max(1, fc.predicted_demand * 2)) * 100)}%` }} /></div></div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3"><span className="text-slate-500">Margin: <span className="font-medium text-slate-700">{fc.margin.toFixed(1)}%</span></span><span className="text-slate-500">Confidence: <span className="font-medium text-slate-700">{(Number(fc.confidence) * 100).toFixed(0)}%</span></span></div>
              {fc.reorder_recommended && <span className="flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle className="w-3 h-3" /> Reorder</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-2 text-center py-12 text-slate-400"><BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" /><p className="text-sm">No forecasts match your filters</p></div>}
      </div>
    </div>
  );
}
