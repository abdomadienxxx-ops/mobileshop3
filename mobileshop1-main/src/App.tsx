import { useState } from 'react';
import { useAuth, AuthProvider } from './lib/auth';
import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import MarketAnalysis from './components/MarketAnalysis';
import Suppliers from './components/Suppliers';
import Forecasting from './components/Forecasting';
import Reports from './components/Reports';
import ReleaseCalendar from './components/ReleaseCalendar';
import SuperAdmin from './components/SuperAdmin';
import StoreSettings from './components/StoreSettings';

const storeOwnerPages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  inventory: Inventory,
  sales: Sales,
  market: MarketAnalysis,
  suppliers: Suppliers,
  forecast: Forecasting,
  reports: Reports,
  releases: ReleaseCalendar,
  settings: StoreSettings,
};

const superAdminPages: Record<string, React.ComponentType> = {
  admin: SuperAdmin,
  dashboard: Dashboard,
  inventory: Inventory,
  sales: Sales,
  market: MarketAnalysis,
  suppliers: Suppliers,
  forecast: Forecasting,
  reports: Reports,
  releases: ReleaseCalendar,
  settings: StoreSettings,
};

function AuthenticatedApp({ currentPage, role }: { currentPage: string; role: 'super_admin' | 'store_owner' | null }) {
  const { navigate } = useAppNavigation();
  const pages = role === 'super_admin' ? superAdminPages : storeOwnerPages;
  const Page = pages[currentPage] || Dashboard;

  return (
    <Layout currentPage={currentPage} onNavigate={navigate}>
      <Page />
    </Layout>
  );
}

function AppContent() {
  const { user, role, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading PhoneVault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <AppNavigationProvider onPageChange={setCurrentPage}>
      <AuthenticatedApp currentPage={currentPage} role={role} />
    </AppNavigationProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
