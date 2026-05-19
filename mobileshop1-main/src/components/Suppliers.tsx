import { useEffect, useState } from 'react';
import { fetchSuppliers } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import type { Supplier } from '../lib/types';
import { Truck, Globe, Star, Search, ChevronDown } from 'lucide-react';

export default function Suppliers() {
  const { tenantId } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantId) { setSuppliers([]); setLoading(false); return; }
      try { setSuppliers(await fetchSuppliers(tenantId)); } catch { setSuppliers([]); }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.country.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><Truck className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{suppliers.length}</p><p className="text-xs text-slate-500">Active Suppliers</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center"><Globe className="w-5 h-5 text-teal-600" /></div><div><p className="text-xl font-bold text-slate-900">{new Set(suppliers.map(s => s.country)).size}</p><p className="text-xs text-slate-500">Countries</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center"><Star className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-slate-900">{suppliers.length > 0 ? (suppliers.reduce((s, sup) => s + Number(sup.rating), 0) / suppliers.length).toFixed(1) : '0'}</p><p className="text-xs text-slate-500">Avg Rating</p></div></div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search suppliers or countries..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div></div>
      <div className="space-y-3">
        {filtered.map((sup) => {
          const expanded = expandedSupplier === sup.id;
          return (
            <div key={sup.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setExpandedSupplier(expanded ? null : sup.id)} className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{sup.name.charAt(0)}</div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-slate-900">{sup.name}</p><span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{sup.country}</span></div><p className="text-xs text-slate-500 mt-0.5">{sup.lead_time_days} day lead time</p></div>
                <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-sm font-semibold text-slate-900">{Number(sup.rating).toFixed(1)}</span></div>
                <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && <div className="px-5 pb-5 border-t border-slate-100"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4"><Detail label="Contact" value={sup.contact_email || 'N/A'} /><Detail label="Lead Time" value={`${sup.lead_time_days} days`} /><Detail label="Rating" value={`${Number(sup.rating).toFixed(1)} / 5.0`} /><Detail label="Country" value={sup.country} /></div></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-slate-900">{value}</p></div>; }
