import { createContext, useCallback, useContext, useState } from 'react';

export type StockFilterValue = 'all' | 'low' | 'out' | 'ok';

export interface InventoryNavFilters {
  stockFilter?: StockFilterValue;
  categoryId?: string;
}

interface NavigateOptions {
  inventory?: InventoryNavFilters;
}

interface AppNavigationContextValue {
  refreshTick: number;
  bumpDataRefresh: () => void;
  inventoryFilterVersion: number;
  navigate: (page: string, options?: NavigateOptions) => void;
  consumeInventoryFilters: () => InventoryNavFilters | null;
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

export function AppNavigationProvider({
  children,
  onPageChange,
}: {
  children: React.ReactNode;
  onPageChange: (page: string) => void;
}) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [pendingInventoryFilters, setPendingInventoryFilters] = useState<InventoryNavFilters | null>(null);
  const [inventoryFilterVersion, setInventoryFilterVersion] = useState(0);

  const bumpDataRefresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  const navigate = useCallback(
    (page: string, options?: NavigateOptions) => {
      if (options?.inventory) {
        setPendingInventoryFilters(options.inventory);
        setInventoryFilterVersion((v) => v + 1);
      } else {
        setPendingInventoryFilters(null);
      }
      onPageChange(page);
    },
    [onPageChange]
  );

  const consumeInventoryFilters = useCallback(() => {
    const filters = pendingInventoryFilters;
    setPendingInventoryFilters(null);
    return filters;
  }, [pendingInventoryFilters]);

  return (
    <AppNavigationContext.Provider
      value={{ refreshTick, bumpDataRefresh, inventoryFilterVersion, navigate, consumeInventoryFilters }}
    >
      {children}
    </AppNavigationContext.Provider>
  );
}

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) throw new Error('useAppNavigation must be used within AppNavigationProvider');
  return ctx;
}
