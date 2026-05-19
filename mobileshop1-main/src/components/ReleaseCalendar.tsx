import { useEffect, useState, useMemo } from 'react';
import { fetchReleases } from '../lib/dataApi';
import { useAuth } from '../lib/auth';
import { formatCurrency, daysUntil, cn, formatDate, isSameCalendarDay, parseDateOnly } from '../lib/utils';
import type { ReleaseCalendar as ReleaseCalendarType } from '../lib/types';
import { Calendar, Clock, Zap, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function ReleaseCalendar() {
  const { tenantId } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [releases, setReleases] = useState<ReleaseCalendarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    async function load() {
      if (!tenantId) { setReleases([]); setLoading(false); return; }
      try { setReleases(await fetchReleases(tenantId)); } catch { setReleases([]); }
      setLoading(false);
    }
    load();
  }, [tenantId]);

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(viewYear, viewMonth, 1)
  );

  const releasesByDate = useMemo(() => {
    const map = new Map<string, ReleaseCalendarType[]>();
    releases.forEach((r) => {
      if (!r.expected_release_date) return;
      const key = r.expected_release_date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [releases]);

  const monthCells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const brands = useMemo(() => [...new Set(releases.map((r) => r.brand))].sort(), [releases]);
  const filtered = releases.filter((r) => {
    const matchSearch = r.brand.toLowerCase().includes(search.toLowerCase()) || r.model.toLowerCase().includes(search.toLowerCase()) || r.notes.toLowerCase().includes(search.toLowerCase());
    const matchBrand = brandFilter === 'all' || r.brand === brandFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchBrand && matchStatus;
  });
  const upcoming = filtered.filter((r) => daysUntil(r.expected_release_date) > 0 && daysUntil(r.expected_release_date) !== Infinity).sort((a, b) => daysUntil(a.expected_release_date) - daysUntil(b.expected_release_date));
  const pastReleases = filtered.filter((r) => daysUntil(r.expected_release_date) <= 0);

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{monthLabel}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Today: {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={prevMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={goToToday} className="px-3 py-2 text-xs font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors">
              Today
            </button>
            <button type="button" onClick={nextMonth} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} className="min-h-[72px] rounded-lg bg-slate-50/50" />;
            const key = `${cell.getFullYear()}-${String(cell.getMonth() + 1).padStart(2, '0')}-${String(cell.getDate()).padStart(2, '0')}`;
            const dayReleases = releasesByDate.get(key) || [];
            const isToday = isSameCalendarDay(cell, today);
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[72px] rounded-lg border p-1.5 text-left transition-colors',
                  isToday ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-300' : 'bg-white border-slate-100'
                )}
              >
                <span className={cn('text-xs font-semibold inline-flex w-6 h-6 items-center justify-center rounded-full', isToday ? 'bg-cyan-600 text-white' : 'text-slate-700')}>
                  {cell.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayReleases.slice(0, 2).map((r) => (
                    <p key={r.id} className="text-[9px] leading-tight text-slate-600 truncate" title={`${r.brand} ${r.model}`}>
                      {r.brand} {r.model}
                    </p>
                  ))}
                  {dayReleases.length > 2 && (
                    <p className="text-[9px] text-cyan-600 font-medium">+{dayReleases.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-cyan-50 ring-1 ring-cyan-200 flex items-center justify-center"><Calendar className="w-5 h-5 text-cyan-600" /></div><div><p className="text-xl font-bold text-slate-900">{upcoming.length}</p><p className="text-xs text-slate-500">Upcoming Releases</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 ring-1 ring-amber-200 flex items-center justify-center"><Zap className="w-5 h-5 text-amber-600" /></div><div><p className="text-xl font-bold text-slate-900">{releases.filter(r => r.status === 'confirmed').length}</p><p className="text-xs text-slate-500">Confirmed</p></div></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-teal-50 ring-1 ring-teal-200 flex items-center justify-center"><Clock className="w-5 h-5 text-teal-600" /></div><div><p className="text-xl font-bold text-slate-900">{brands.length}</p><p className="text-xs text-slate-500">Brands Tracked</p></div></div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search releases..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" /></div>
        <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option value="all">All Brands</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option value="all">All Status</option><option value="confirmed">Confirmed</option><option value="rumored">Rumored</option></select>
      </div>
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming Releases</h3>
          <div className="space-y-3">
            {upcoming.map((r) => {
              const d = daysUntil(r.expected_release_date);
              const isConfirmed = r.status === 'confirmed';
              const releaseIsToday = r.expected_release_date && isSameCalendarDay(parseDateOnly(r.expected_release_date.slice(0, 10)), today);
              return (
                <div key={r.id} className={cn('bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow', releaseIsToday ? 'border-cyan-400 ring-1 ring-cyan-200' : 'border-slate-200')}>
                  <div className="flex items-start gap-4">
                    <div className={cn('w-3 h-3 rounded-full ring-4 mt-1 shrink-0', isConfirmed ? 'bg-emerald-500 ring-emerald-100' : 'bg-amber-500 ring-amber-100')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-900">{r.brand} {r.model}</h4>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{r.status}</span>
                        {releaseIsToday && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">Today</span>}
                        {r.categories?.name && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.categories.name}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(r.expected_release_date)}</span>
                        <span className={cn('font-medium', d <= 30 ? 'text-red-600' : d <= 90 ? 'text-amber-600' : 'text-slate-500')}>{d} days away</span>
                        {r.estimated_price > 0 && <span>Est. {formatCurrency(r.estimated_price)}</span>}
                      </div>
                      {r.notes && <p className="text-xs text-slate-600 leading-relaxed">{r.notes}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {pastReleases.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Released</h3>
          <div className="space-y-2">
            {pastReleases.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700">{r.brand} {r.model}</h4>
                    <p className="text-xs text-slate-500">{formatDate(r.expected_release_date)}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Released</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No releases match your filters</p>
        </div>
      )}
    </div>
  );
}
