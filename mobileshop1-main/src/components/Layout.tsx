import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  BarChart3,
  Calendar,
  Menu,
  X,
  Smartphone,
  LogOut,
  Shield,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import type { InventoryNavFilters } from '../lib/navigation';

type Page = 'dashboard' | 'inventory' | 'sales' | 'market' | 'suppliers' | 'forecast' | 'reports' | 'releases' | 'admin' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string, options?: { inventory?: InventoryNavFilters }) => void;
}

const storeOwnerNav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'market', label: 'Market Analysis', icon: TrendingUp },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'forecast', label: 'Forecasting', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'releases', label: 'Release Calendar', icon: Calendar },
  { id: 'settings', label: 'Store Settings', icon: Settings },
];

const superAdminNav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'admin', label: 'Tenant Management', icon: Shield },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'market', label: 'Market Analysis', icon: TrendingUp },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'forecast', label: 'Forecasting', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'releases', label: 'Release Calendar', icon: Calendar },
  { id: 'settings', label: 'Store Settings', icon: Settings },
];

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, tenantName, signOut } = useAuth();

  const navItems = role === 'super_admin' ? superAdminNav : storeOwnerNav;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">PhoneVault</h1>
            <p className="text-[11px] text-slate-400 tracking-wide truncate">
              {role === 'super_admin' ? 'SUPER ADMIN' : (tenantName || 'STORE OWNER').toUpperCase()}
            </p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  active ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}>
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              <p>PhoneVault SaaS v2.0</p>
              <p className="mt-0.5">Role: {role === 'super_admin' ? 'Super Admin' : 'Store Owner'}</p>
            </div>
            <button onClick={signOut} className="text-slate-400 hover:text-white transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-600 hover:text-slate-900" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 capitalize">
              {navItems.find((i) => i.id === currentPage)?.label || 'Dashboard'}
            </h2>
            {role === 'super_admin' && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Admin View</span>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
