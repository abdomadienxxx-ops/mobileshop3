export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** Current moment as ISO-8601 (system clock). */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Today's calendar date as YYYY-MM-DD (system clock). */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(date: string | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: string | null): boolean {
  if (!date) return false;
  return isSameCalendarDay(new Date(date), new Date());
}

export function parseDateOnly(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysUntil(date: string | null): number {
  if (!date) return Infinity;
  const now = new Date();
  const target = new Date(date);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function profitMargin(cost: number, price: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function profitMarginColor(margin: number): string {
  if (margin > 30) return 'text-emerald-400';
  if (margin >= 10) return 'text-yellow-400';
  return 'text-red-400';
}

export function stockStatus(quantity: number, reorderLevel: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (quantity === 0) return { label: 'Out of Stock', color: 'text-red-700', bg: 'bg-red-50' };
  if (quantity <= reorderLevel) return { label: 'Low Stock', color: 'text-amber-700', bg: 'bg-amber-50' };
  if (quantity <= reorderLevel * 2) return { label: 'Adequate', color: 'text-blue-700', bg: 'bg-blue-50' };
  return { label: 'Well Stocked', color: 'text-emerald-700', bg: 'bg-emerald-50' };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function exportToExcel(data: Record<string, string | number>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','))
  ];
  const csvContent = csvRows.join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
