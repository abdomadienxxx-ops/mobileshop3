import type {
  Category,
  Product,
  Sale,
  Supplier,
  CompetitorPrice,
  InventoryForecast,
  ReleaseCalendar,
  Tenant,
} from './types';

export const DEMO_TENANT_ID = 'demo-tenant-0001';
const STORAGE_KEY = 'phonevault_local_db';

interface DbState {
  categories: Category[];
  products: Product[];
  sales: Sale[];
  suppliers: Supplier[];
  competitorPrices: CompetitorPrice[];
  inventoryForecasts: InventoryForecast[];
  releases: ReleaseCalendar[];
  tenants: Tenant[];
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadState(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DbState;
      if (parsed.categories && parsed.products) return parsed;
    }
  } catch {
    /* ignore */
  }
  const seed: DbState = {
    categories: [],
    products: [],
    sales: [],
    suppliers: [],
    competitorPrices: [],
    inventoryForecasts: [],
    releases: [],
    tenants: [],
  };
  saveState(seed);
  return seed;
}

function saveState(state: DbState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mutate(fn: (state: DbState) => void): void {
  const state = loadState();
  fn(state);
  saveState(state);
}

function enrichProducts(products: Product[], state: DbState): Product[] {
  return products.map((p) => ({
    ...p,
    categories: state.categories.find((c) => c.id === p.category_id),
    suppliers: p.supplier_id ? state.suppliers.find((s) => s.id === p.supplier_id) : undefined,
  }));
}

function enrichSales(sales: Sale[], state: DbState): Sale[] {
  return sales.map((s) => ({
    ...s,
    products: state.products.find((p) => p.id === s.product_id),
  }));
}

export function getCategories(tenantId: string): Category[] {
  return loadState()
    .categories.filter((c) => c.tenant_id === tenantId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function insertCategory(
  tenantId: string,
  data: { name: string; slug: string; description: string }
): { error: { code?: string; message: string } | null } {
  const state = loadState();
  const duplicate = state.categories.some(
    (c) => c.tenant_id === tenantId && (c.slug === data.slug || c.name.toLowerCase() === data.name.toLowerCase())
  );
  if (duplicate) return { error: { code: '23505', message: 'A category with this name already exists.' } };
  const category: Category = {
    id: generateId(),
    name: data.name,
    slug: data.slug,
    description: data.description,
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
  };
  mutate((s) => {
    s.categories.push(category);
  });
  return { error: null };
}

export function updateCategory(
  id: string,
  data: { name: string; slug: string; description: string }
): { error: { code?: string; message: string } | null } {
  const state = loadState();
  const cat = state.categories.find((c) => c.id === id);
  if (!cat) return { error: { message: 'Category not found.' } };
  const duplicate = state.categories.some(
    (c) => c.id !== id && c.tenant_id === cat.tenant_id && (c.slug === data.slug || c.name.toLowerCase() === data.name.toLowerCase())
  );
  if (duplicate) return { error: { code: '23505', message: 'A category with this name already exists.' } };
  mutate((s) => {
    const target = s.categories.find((c) => c.id === id);
    if (target) {
      target.name = data.name;
      target.slug = data.slug;
      target.description = data.description;
    }
  });
  return { error: null };
}

export function deleteCategory(id: string): { error: { message: string } | null } {
  mutate((s) => {
    s.categories = s.categories.filter((c) => c.id !== id);
  });
  return { error: null };
}

export function getProducts(tenantId: string): Product[] {
  const state = loadState();
  return enrichProducts(
    state.products.filter((p) => p.tenant_id === tenantId).sort((a, b) => a.brand.localeCompare(b.brand)),
    state
  );
}

export function insertProduct(
  tenantId: string,
  data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'categories' | 'suppliers'>
): { error: { message: string } | null } {
  const now = new Date().toISOString();
  const product: Product = {
    ...data,
    id: generateId(),
    tenant_id: tenantId,
    created_at: now,
    updated_at: now,
  };
  mutate((s) => {
    s.products.push(product);
  });
  return { error: null };
}

export function updateProductStock(id: string, stock_quantity: number): { error: { message: string } | null } {
  mutate((s) => {
    const p = s.products.find((x) => x.id === id);
    if (p) {
      p.stock_quantity = stock_quantity;
      p.updated_at = new Date().toISOString();
    }
  });
  return { error: null };
}

export function updateProduct(
  id: string,
  data: Partial<Pick<Product, 'name' | 'brand' | 'wholesale_cost' | 'retail_price' | 'reorder_level'>>
): { error: { message: string } | null } {
  mutate((s) => {
    const p = s.products.find((x) => x.id === id);
    if (p) {
      Object.assign(p, data);
      p.updated_at = new Date().toISOString();
    }
  });
  return { error: null };
}

export function deleteProduct(id: string): { error: { message: string } | null } {
  mutate((s) => {
    s.products = s.products.filter((p) => p.id !== id);
    s.sales = s.sales.filter((sale) => sale.product_id !== id);
    s.competitorPrices = s.competitorPrices.filter((c) => c.product_id !== id);
    s.inventoryForecasts = s.inventoryForecasts.filter((f) => f.product_id !== id);
  });
  return { error: null };
}

export function findOrCreateCategory(tenantId: string, categoryName: string): string | null {
  const state = loadState();
  const existing = state.categories.find(
    (c) => c.tenant_id === tenantId && c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (existing) return existing.id;
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
  const result = insertCategory(tenantId, { name: categoryName, slug, description: '' });
  if (result.error) return null;
  const created = loadState().categories.find(
    (c) => c.tenant_id === tenantId && c.name.toLowerCase() === categoryName.toLowerCase()
  );
  return created?.id || null;
}

export function getSales(tenantId: string, limit = 200): Sale[] {
  const state = loadState();
  return enrichSales(
    state.sales
      .filter((s) => s.tenant_id === tenantId)
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
      .slice(0, limit),
    state
  );
}

export function insertSale(
  tenantId: string,
  data: {
    product_id: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    sale_date: string;
    channel: string;
    customer_type: string;
    serial_number?: string;
  }
): { error: { message: string } | null } {
  const state = loadState();
  const product = state.products.find((p) => p.id === data.product_id);
  if (!product) return { error: { message: 'Product not found.' } };
  const sale: Sale = {
    id: generateId(),
    ...data,
    tenant_id: tenantId,
    products: product,
  };
  mutate((s) => {
    s.sales.push(sale);
    const p = s.products.find((x) => x.id === data.product_id);
    if (p) {
      p.stock_quantity -= data.quantity;
      p.updated_at = new Date().toISOString();
    }
  });
  return { error: null };
}

export function getSuppliers(tenantId: string): Supplier[] {
  return loadState()
    .suppliers.filter((s) => s.tenant_id === tenantId)
    .sort((a, b) => b.rating - a.rating);
}

export function getCompetitorPrices(tenantId: string): CompetitorPrice[] {
  const state = loadState();
  return state.competitorPrices
    .filter((c) => c.tenant_id === tenantId)
    .map((c) => ({
      ...c,
      products: state.products.find((p) => p.id === c.product_id),
    }))
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
}

export function getForecasts(tenantId: string): InventoryForecast[] {
  const state = loadState();
  return state.inventoryForecasts
    .filter((f) => f.tenant_id === tenantId)
    .map((f) => ({
      ...f,
      products: state.products.find((p) => p.id === f.product_id),
    }))
    .sort((a, b) => a.days_of_stock - b.days_of_stock);
}

export function getReleases(tenantId: string): ReleaseCalendar[] {
  const state = loadState();
  return state.releases
    .filter((r) => r.tenant_id === tenantId)
    .map((r) => ({
      ...r,
      categories: r.category_id ? state.categories.find((c) => c.id === r.category_id) : undefined,
    }))
    .sort((a, b) => {
      const da = a.expected_release_date ? new Date(a.expected_release_date).getTime() : 0;
      const db = b.expected_release_date ? new Date(b.expected_release_date).getTime() : 0;
      return da - db;
    });
}

export function getTenants(): Tenant[] {
  return loadState().tenants.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
