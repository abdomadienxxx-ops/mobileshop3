import { useEffect, useState } from 'react';
import { fetchTenants } from '../lib/dataApi';
import { formatDate, cn } from '../lib/utils';
import type { Tenant } from '../lib/types';
import { Building2, CreditCard, Search, ChevronDown, CheckCircle } from 'lucide-react';

export default function SuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setTenants(await fetchTenants());
      } catch {
        setTenants([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = tenants.filter((t) => t.active).length;
  const planCounts = tenants.reduce((acc, t) => { acc[t.plan] = (acc[t.plan] || 0) + 1; return acc; }, {} as Record<string, number>);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><Building2 className="w-5 h-5 text-cyan-600" /></div>
          <div><p className="text-xl font-bold text-slate-900">{tenants.length}</p><p className="text-xs text-slate-500">Total Tenants</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xl font-bold text-slate-900">{activeCount}</p><p className="text-xs text-slate-500">Active</p></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center"><CreditCard className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xl font-bold text-slate-900">{Object.keys(planCounts).length}</p><p className="text-xs text-slate-500">Plans</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((t) => {
          const expanded = expandedTenant === t.id;
          return (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setExpandedTenant(expanded ? null : t.id)} className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-100 to-teal-100 flex items-center justify-center text-sm font-bold text-cyan-700">
                  {t.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', t.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                      {t.active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{t.plan}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t.slug} &middot; Created {formatDate(t.created_at)}</p>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    <Detail label="Tenant ID" value={t.id.substring(0, 8) + '...'} />
                    <Detail label="Plan" value={t.plan.charAt(0).toUpperCase() + t.plan.slice(1)} />
                    <Detail label="Status" value={t.active ? 'Active' : 'Inactive'} />
                    <Detail label="Created" value={formatDate(t.created_at)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-medium text-slate-900">{value}</p></div>;
}
