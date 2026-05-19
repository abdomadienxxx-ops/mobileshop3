export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'store_owner';
  created_at: string;
  tenants?: Tenant;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  tenant_id: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact_email: string;
  lead_time_days: number;
  rating: number;
  tenant_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  sku: string;
  category_id: string;
  supplier_id: string;
  wholesale_cost: number;
  retail_price: number;
  stock_quantity: number;
  reorder_level: number;
  specs: Record<string, unknown>;
  release_date: string | null;
  discontinued: boolean;
  image_url: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  categories?: Category;
  suppliers?: Supplier;
}

export interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  channel: string;
  customer_type: string;
  serial_number?: string;
  tenant_id: string;
  products?: Product;
}

export interface CompetitorPrice {
  id: string;
  product_id: string;
  competitor_name: string;
  price: number;
  in_stock: boolean;
  recorded_at: string;
  tenant_id: string;
  products?: Product;
}

export interface SupplierPriceList {
  id: string;
  supplier_id: string;
  product_id: string;
  wholesale_price: number;
  min_order_qty: number;
  bulk_discount_pct: number;
  valid_from: string;
  valid_to: string | null;
  recorded_at: string;
  tenant_id: string;
  suppliers?: Supplier;
  products?: Product;
}

export interface InventoryForecast {
  id: string;
  product_id: string;
  forecast_date: string;
  predicted_demand: number;
  current_stock: number;
  days_of_stock: number;
  reorder_recommended: boolean;
  confidence: number;
  tenant_id: string;
  created_at: string;
  products?: Product;
}

export interface ReleaseCalendar {
  id: string;
  brand: string;
  model: string;
  expected_release_date: string | null;
  estimated_price: number;
  category_id: string | null;
  status: string;
  notes: string;
  tenant_id: string;
  created_at: string;
  categories?: Category;
}

export interface AuthState {
  user: { id: string; email: string } | null;
  role: 'super_admin' | 'store_owner' | null;
  tenantId: string | null;
  tenantName: string | null;
  loading: boolean;
}
