import { useState } from 'react';
import { AppNavigationProvider, useAppNavigation } from './lib/navigation';
import Layout from './components/Layout';
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

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  inventory: Inventory,
  sales: Sales,
  market: MarketAnalysis,
  suppliers: Suppliers,
  forecast: Forecasting,
  reports: Reports,
  releases: ReleaseCalendar,
  admin: SuperAdmin,
  settings: StoreSettings,
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  function PageShell() {
    const { navigate } = useAppNavigation();
    const Page = pages[currentPage] || Dashboard;

    return (
      <Layout currentPage={currentPage} onNavigate={navigate}>
        <Page />
      </Layout>
    );
  }

  return (
    <AppNavigationProvider onPageChange={setCurrentPage}>
      <PageShell />
    </AppNavigationProvider>
  );
}

export default App;
